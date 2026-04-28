import { badRequest } from '../utils/httpError.js'

const DEFAULT_CANVAS_WIDTH = 1200
const DEFAULT_CANVAS_HEIGHT = 720
const DETECTION_WIDTH = 110
const DETECTION_HEIGHT = 76

function readPngSize(buffer) {
  if (buffer.length < 24) return null
  if (buffer.readUInt32BE(0) !== 0x89504e47) return null
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
  }
}

function readGifSize(buffer) {
  if (buffer.length < 10) return null
  const header = buffer.toString('ascii', 0, 6)
  if (header !== 'GIF87a' && header !== 'GIF89a') return null
  return {
    width: buffer.readUInt16LE(6),
    height: buffer.readUInt16LE(8),
  }
}

function readJpegSize(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return null
  let offset = 2
  while (offset + 9 < buffer.length) {
    if (buffer[offset] !== 0xff) {
      offset += 1
      continue
    }
    const marker = buffer[offset + 1]
    const size = buffer.readUInt16BE(offset + 2)
    const isSof =
      marker === 0xc0 ||
      marker === 0xc1 ||
      marker === 0xc2 ||
      marker === 0xc3 ||
      marker === 0xc5 ||
      marker === 0xc6 ||
      marker === 0xc7 ||
      marker === 0xc9 ||
      marker === 0xca ||
      marker === 0xcb ||
      marker === 0xcd ||
      marker === 0xce ||
      marker === 0xcf
    if (isSof && offset + 8 < buffer.length) {
      return {
        height: buffer.readUInt16BE(offset + 5),
        width: buffer.readUInt16BE(offset + 7),
      }
    }
    if (size < 2) break
    offset += 2 + size
  }
  return null
}

function readWebpSize(buffer) {
  if (buffer.length < 30) return null
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WEBP') return null
  const chunk = buffer.toString('ascii', 12, 16)
  if (chunk === 'VP8 ') return null
  if (chunk === 'VP8L') {
    const b0 = buffer[21]
    const b1 = buffer[22]
    const b2 = buffer[23]
    const b3 = buffer[24]
    return {
      width: 1 + (((b1 & 0x3f) << 8) | b0),
      height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)),
    }
  }
  if (chunk === 'VP8X') {
    return {
      width: 1 + buffer.readUIntLE(24, 3),
      height: 1 + buffer.readUIntLE(27, 3),
    }
  }
  return null
}

function readImageSize(buffer, mimetype) {
  const type = String(mimetype || '').toLowerCase()
  if (type === 'image/png') return readPngSize(buffer)
  if (type === 'image/jpeg' || type === 'image/jpg') return readJpegSize(buffer)
  if (type === 'image/gif') return readGifSize(buffer)
  if (type === 'image/webp') return readWebpSize(buffer)
  return readPngSize(buffer) || readJpegSize(buffer) || readGifSize(buffer) || readWebpSize(buffer)
}

function buildFallbackDetections(tableCount, imageWidth, imageHeight) {
  const count = Math.max(1, Number(tableCount) || 1)
  const columns = Math.min(8, Math.max(3, Math.ceil(Math.sqrt(count * (imageWidth / Math.max(imageHeight, 1))))))
  const rows = Math.max(1, Math.ceil(count / columns))
  const xGap = (DEFAULT_CANVAS_WIDTH - columns * DETECTION_WIDTH) / (columns + 1)
  const yGap = (DEFAULT_CANVAS_HEIGHT - rows * DETECTION_HEIGHT) / (rows + 1)

  return Array.from({ length: count }, (_, index) => {
    const col = index % columns
    const row = Math.floor(index / columns)
    const x = Math.round(xGap + col * (DETECTION_WIDTH + xGap))
    const y = Math.round(yGap + row * (DETECTION_HEIGHT + yGap))
    return {
      x,
      y,
      width: DETECTION_WIDTH,
      height: DETECTION_HEIGHT,
      confidence: 0.35,
      source: 'fallback',
    }
  })
}

async function analyzeWithExternalService(file, tableCount) {
  const endpoint = String(process.env.TABLE_LAYOUT_VISION_ENDPOINT || '').trim()
  if (!endpoint) return null

  const body = {
    imageBase64: file.buffer.toString('base64'),
    mimeType: file.mimetype,
    fileName: file.originalname,
    mode: 'layout_only',
    tableCount,
    canvasWidth: DEFAULT_CANVAS_WIDTH,
    canvasHeight: DEFAULT_CANVAS_HEIGHT,
  }

  const headers = {
    'Content-Type': 'application/json',
  }
  const bearer = String(process.env.TABLE_LAYOUT_VISION_API_KEY || '').trim()
  if (bearer) headers.Authorization = `Bearer ${bearer}`

  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    throw new Error(`Vision service error ${res.status}`)
  }
  const json = await res.json()
  const detections = Array.isArray(json?.detections) ? json.detections : []
  return {
    source: 'external',
    detections: detections.map((item) => ({
      x: Number(item.x) || 0,
      y: Number(item.y) || 0,
      width: Number(item.width) || DETECTION_WIDTH,
      height: Number(item.height) || DETECTION_HEIGHT,
      confidence: Number(item.confidence) || 0.5,
      source: 'external',
    })),
    warnings: Array.isArray(json?.warnings) ? json.warnings : [],
  }
}

export async function analyzeTableLayoutImage({ file, tableCount }) {
  if (!file?.buffer?.length) throw badRequest('Thiếu file ảnh')
  const image = readImageSize(file.buffer, file.mimetype)
  const imageWidth = image?.width || DEFAULT_CANVAS_WIDTH
  const imageHeight = image?.height || DEFAULT_CANVAS_HEIGHT

  try {
    const external = await analyzeWithExternalService(file, tableCount)
    if (external?.detections?.length) {
      return {
        canvasWidth: DEFAULT_CANVAS_WIDTH,
        canvasHeight: DEFAULT_CANVAS_HEIGHT,
        imageWidth,
        imageHeight,
        source: external.source,
        detections: external.detections,
        warnings: external.warnings,
      }
    }
  } catch (e) {
    return {
      canvasWidth: DEFAULT_CANVAS_WIDTH,
      canvasHeight: DEFAULT_CANVAS_HEIGHT,
      imageWidth,
      imageHeight,
      source: 'fallback',
      detections: buildFallbackDetections(tableCount, imageWidth, imageHeight),
      warnings: [`AI vision ngoài không khả dụng, đã dùng layout gợi ý. ${e.message}`],
    }
  }

  return {
    canvasWidth: DEFAULT_CANVAS_WIDTH,
    canvasHeight: DEFAULT_CANVAS_HEIGHT,
    imageWidth,
    imageHeight,
    source: 'fallback',
    detections: buildFallbackDetections(tableCount, imageWidth, imageHeight),
    warnings: ['Chưa cấu hình AI vision ngoài, đã dùng layout gợi ý để bạn chỉnh tiếp.'],
  }
}
