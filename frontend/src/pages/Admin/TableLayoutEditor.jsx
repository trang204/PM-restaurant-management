import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { analyzeTableLayoutImage, apiFetch } from '../../lib/api'
import { useNotifications } from '../../context/NotificationsContext'
import './TableLayoutEditor.css'

const CANVAS_WIDTH = 1200
const CANVAS_HEIGHT = 720
const SEAT_WIDTH = 110
const SEAT_HEIGHT = 76
const PADDING = 24
const ROW_GAP = 96
const COL_GAP = 136
const START_X = 48
const START_Y = 96
const LEGACY_GRID_LIMIT = 20

function statusLabel(status) {
  const s = String(status || '').toUpperCase()
  if (s === 'AVAILABLE') return 'Trống'
  if (s === 'OCCUPIED' || s === 'IN_USE' || s === 'IN USE') return 'Đang dùng'
  if (s === 'RESERVED') return 'Đã giữ'
  if (s === 'CLOSED') return 'Đóng'
  return status || '—'
}

function seatClass(status) {
  const s = String(status || '').toUpperCase()
  if (s === 'AVAILABLE') return 'layout-editor__seat--available'
  if (s === 'OCCUPIED' || s === 'IN_USE' || s === 'IN USE') return 'layout-editor__seat--occupied'
  if (s === 'RESERVED') return 'layout-editor__seat--reserved'
  return 'layout-editor__seat--closed'
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value))
}

function theaterPosition(index) {
  const col = index % 8
  const row = Math.floor(index / 8)
  return {
    x: START_X + col * COL_GAP,
    y: START_Y + row * ROW_GAP,
  }
}

function normalizeStoredPosition(table, index) {
  const x = Number(table?.pos_x)
  const y = Number(table?.pos_y)

  if (Number.isFinite(x) && Number.isFinite(y)) {
    if (x > LEGACY_GRID_LIMIT || y > LEGACY_GRID_LIMIT) {
      return {
        x: clamp(x, PADDING, CANVAS_WIDTH - SEAT_WIDTH - PADDING),
        y: clamp(y, PADDING, CANVAS_HEIGHT - SEAT_HEIGHT - PADDING),
      }
    }
    const pos = theaterPosition(index)
    return {
      x: clamp(START_X + (Math.max(1, x) - 1) * COL_GAP, PADDING, CANVAS_WIDTH - SEAT_WIDTH - PADDING),
      y: clamp(START_Y + (Math.max(1, y) - 1) * ROW_GAP, PADDING, CANVAS_HEIGHT - SEAT_HEIGHT - PADDING),
    }
  }

  return theaterPosition(index)
}

export default function TableLayoutEditor() {
  const navigate = useNavigate()
  const { toast } = useNotifications()
  const [tables, setTables] = useState([])
  const [positions, setPositions] = useState({})
  const [draggingId, setDraggingId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [analyzingImage, setAnalyzingImage] = useState(false)
  const [err, setErr] = useState(null)
  const [analysisError, setAnalysisError] = useState(null)
  const [analysisWarnings, setAnalysisWarnings] = useState([])
  const [analysisSource, setAnalysisSource] = useState('')
  const [sourceImagePreview, setSourceImagePreview] = useState('')
  const canvasRef = useRef(null)
  const dragRef = useRef(null)

  useEffect(() => {
    setLoading(true)
    apiFetch('/tables')
      .then((d) => {
        const rows = Array.isArray(d) ? d : []
        setTables(rows)
        setPositions(
          Object.fromEntries(rows.map((table, index) => [table.id, normalizeStoredPosition(table, index)])),
        )
      })
      .catch((e) => setErr(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    return () => {
      if (sourceImagePreview?.startsWith('blob:')) {
        URL.revokeObjectURL(sourceImagePreview)
      }
    }
  }, [sourceImagePreview])

  const dirty = useMemo(
    () =>
      tables.some((table, index) => {
        const current = positions[table.id]
        const saved = normalizeStoredPosition(table, index)
        if (!current) return false
        return current.x !== saved.x || current.y !== saved.y
      }),
    [positions, tables],
  )

  function startDrag(e, tableId) {
    const point = 'touches' in e ? e.touches[0] : e
    const canvas = canvasRef.current
    const seat = e.currentTarget
    if (!canvas || !seat) return
    const canvasRect = canvas.getBoundingClientRect()
    const seatRect = seat.getBoundingClientRect()
    dragRef.current = {
      id: tableId,
      offsetX: point.clientX - seatRect.left,
      offsetY: point.clientY - seatRect.top,
      canvasRect,
    }
    setDraggingId(tableId)
  }

  useEffect(() => {
    if (!draggingId) return undefined

    function updatePosition(point) {
      const drag = dragRef.current
      if (!drag) return
      const nextX = point.clientX - drag.canvasRect.left - drag.offsetX
      const nextY = point.clientY - drag.canvasRect.top - drag.offsetY
      setPositions((prev) => ({
        ...prev,
        [drag.id]: {
          x: clamp(Math.round(nextX), PADDING, CANVAS_WIDTH - SEAT_WIDTH - PADDING),
          y: clamp(Math.round(nextY), PADDING, CANVAS_HEIGHT - SEAT_HEIGHT - PADDING),
        },
      }))
    }

    function onMouseMove(e) {
      updatePosition(e)
    }

    function onTouchMove(e) {
      if (!e.touches?.length) return
      updatePosition(e.touches[0])
    }

    function stopDrag() {
      setDraggingId(null)
      dragRef.current = null
    }

    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', stopDrag)
    window.addEventListener('touchmove', onTouchMove, { passive: false })
    window.addEventListener('touchend', stopDrag)
    return () => {
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', stopDrag)
      window.removeEventListener('touchmove', onTouchMove)
      window.removeEventListener('touchend', stopDrag)
    }
  }, [draggingId])

  async function saveLayout() {
    setSaving(true)
    setErr(null)
    try {
      await Promise.all(
        tables.map((table) => {
          const pos = positions[table.id]
          return apiFetch(`/tables/${table.id}`, {
            method: 'PATCH',
            body: JSON.stringify({ pos_x: pos?.x ?? null, pos_y: pos?.y ?? null }),
          })
        }),
      )
      toast('Đã lưu sơ đồ bàn.', { variant: 'success' })
      navigate('/admin/tables')
    } catch (e) {
      setErr(e.message)
      toast(e.message, { variant: 'error' })
    } finally {
      setSaving(false)
    }
  }

  function resetTheaterLayout() {
    setPositions(Object.fromEntries(tables.map((table, index) => [table.id, theaterPosition(index)])))
  }

  async function onImageSelected(e) {
    const file = e.target.files?.[0]
    if (!file) return

    if (sourceImagePreview?.startsWith('blob:')) {
      URL.revokeObjectURL(sourceImagePreview)
    }
    const previewUrl = URL.createObjectURL(file)
    setSourceImagePreview(previewUrl)
    setAnalysisError(null)
    setAnalysisWarnings([])
    setAnalyzingImage(true)

    try {
      const result = await analyzeTableLayoutImage(file)
      setAnalysisSource(result.source || '')
      setAnalysisWarnings(Array.isArray(result.warnings) ? result.warnings : [])
      setPositions((prev) => {
        const next = { ...prev }
        const detections = Array.isArray(result.detections) ? result.detections : []
        tables.forEach((table, index) => {
          const hit = detections[index]
          if (!hit) return
          next[table.id] = {
            x: clamp(Math.round(Number(hit.x) || 0), PADDING, CANVAS_WIDTH - SEAT_WIDTH - PADDING),
            y: clamp(Math.round(Number(hit.y) || 0), PADDING, CANVAS_HEIGHT - SEAT_HEIGHT - PADDING),
          }
        })
        return next
      })
      toast('Đã tạo layout nháp từ ảnh. Bạn kiểm tra lại rồi bấm Lưu sơ đồ.', { variant: 'success' })
    } catch (error) {
      setAnalysisError(error.message)
      toast(error.message, { variant: 'error' })
    } finally {
      setAnalyzingImage(false)
      e.target.value = ''
    }
  }

  return (
    <div className="layout-editor">
      <header className="layout-editor__head">
        <div>
          <h1 className="layout-editor__title">Chỉnh sơ đồ bàn</h1>
          <p className="layout-editor__sub">Kéo thả tự do từng bàn. Khi ổn rồi, bấm Lưu sơ đồ để cập nhật.</p>
        </div>
        <div className="layout-editor__actions">
          <button type="button" className="layout-editor__btn layout-editor__btn--ghost" onClick={() => navigate('/admin/tables')}>
            Quay lại
          </button>
          <button type="button" className="layout-editor__btn layout-editor__btn--ghost" onClick={resetTheaterLayout} disabled={loading || saving}>
            Xếp kiểu rạp phim
          </button>
          <button type="button" className="layout-editor__btn layout-editor__btn--primary" onClick={saveLayout} disabled={loading || saving || !dirty}>
            {saving ? 'Đang lưu...' : 'Lưu sơ đồ'}
          </button>
        </div>
      </header>

      <div className="layout-editor__legend">
        <span><i className="layout-editor__legendDot layout-editor__legendDot--available" /> Trống</span>
        <span><i className="layout-editor__legendDot layout-editor__legendDot--occupied" /> Đang dùng</span>
        <span><i className="layout-editor__legendDot layout-editor__legendDot--reserved" /> Đã giữ</span>
      </div>

      <section className="layout-editor__aiPanel">
        <div className="layout-editor__aiHead">
          <div>
            <h2 className="layout-editor__aiTitle">Nhận diện từ ảnh</h2>
            <p className="layout-editor__aiSub">Tải ảnh mặt bằng hoặc sơ đồ 2D. Hệ thống sẽ sinh layout nháp để bạn kéo chỉnh tiếp.</p>
          </div>
          <label className="layout-editor__uploadBtn">
            {analyzingImage ? 'Đang phân tích...' : 'Tải ảnh mặt bằng'}
            <input type="file" accept="image/*" onChange={onImageSelected} disabled={analyzingImage || saving} hidden />
          </label>
        </div>

        {sourceImagePreview ? (
          <div className="layout-editor__aiPreview">
            <img src={sourceImagePreview} alt="Ảnh mặt bằng tải lên" className="layout-editor__aiPreviewImg" />
            <div className="layout-editor__aiMeta">
              <strong>Nguồn nhận diện:</strong> {analysisSource === 'external' ? 'AI vision ngoài' : analysisSource === 'fallback' ? 'Layout gợi ý fallback' : '—'}
            </div>
          </div>
        ) : null}

        {analysisWarnings.length ? (
          <ul className="layout-editor__warnings">
            {analysisWarnings.map((warning, index) => (
              <li key={`${warning}-${index}`}>{warning}</li>
            ))}
          </ul>
        ) : null}
        {analysisError ? <p className="layout-editor__err">{analysisError}</p> : null}
      </section>

      {loading ? <p>Đang tải sơ đồ...</p> : null}
      {err ? <p className="layout-editor__err">{err}</p> : null}

      <div className="layout-editor__canvasWrap">
        <div className="layout-editor__screen">Lối vào / quầy đón khách</div>
        <div ref={canvasRef} className="layout-editor__canvas">
          {tables.map((table) => {
            const pos = positions[table.id] || theaterPosition(0)
            return (
              <button
                key={table.id}
                type="button"
                className={`layout-editor__seat ${seatClass(table.status)}${draggingId === table.id ? ' layout-editor__seat--dragging' : ''}`}
                style={{ left: pos.x, top: pos.y, width: SEAT_WIDTH, height: SEAT_HEIGHT }}
                onMouseDown={(e) => startDrag(e, table.id)}
                onTouchStart={(e) => startDrag(e, table.id)}
                title={`${table.name} · ${statusLabel(table.status)}`}
              >
                <strong>{table.name}</strong>
                <span>{table.capacity} chỗ</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
