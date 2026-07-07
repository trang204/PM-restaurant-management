import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { query } from '../config/db.js'
import { saveFileWithBackup, syncLocalBackup } from './fileHelper.js'

export async function syncUploads() {
  // Khôi phục từ uploads_backup sang uploads trước
  await syncLocalBackup()

  const sourceUrl = (process.env.UPLOAD_SOURCE_URL || process.env.IMAGE_SOURCE_URL || '').trim()
  if (!sourceUrl) {
    // eslint-disable-next-line no-console
    console.log(
      '[Sync Uploads] Bỏ qua tải ảnh từ remote do chưa cấu hình UPLOAD_SOURCE_URL trong .env.'
    )
    return
  }

  // Clean trailing slash
  const cleanSourceUrl = sourceUrl.replace(/\/$/, '')
  
  // Resolve local uploads directory
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  const uploadsDir = path.resolve(__dirname, '../../uploads')

  try {
    // Ensure uploads directory exists
    await fs.mkdir(uploadsDir, { recursive: true })

    // Collect all image paths from database
    const imagePaths = new Set()

    // 1. Foods
    const foods = await query(
      "SELECT image_url FROM foods WHERE image_url IS NOT NULL AND image_url != ''"
    )
    foods.rows.forEach((row) => imagePaths.add(row.image_url))

    // 2. Tables
    const tables = await query(
      "SELECT image_url FROM tables WHERE image_url IS NOT NULL AND image_url != ''"
    )
    tables.rows.forEach((row) => imagePaths.add(row.image_url))

    // 3. Users
    const users = await query(
      "SELECT avatar_url FROM users WHERE avatar_url IS NOT NULL AND avatar_url != ''"
    )
    users.rows.forEach((row) => imagePaths.add(row.avatar_url))

    // 4. Settings (logo and banners)
    const settings = await query(
      'SELECT logo_url, banner_urls FROM settings'
    )
    settings.rows.forEach((row) => {
      if (row.logo_url) imagePaths.add(row.logo_url)
      if (Array.isArray(row.banner_urls)) {
        row.banner_urls.forEach((url) => {
          if (url) imagePaths.add(url)
        })
      }
    })

    // Extract local filenames for paths starting with /uploads/
    const missingFiles = []
    for (const imagePath of imagePaths) {
      if (imagePath.startsWith('/uploads/')) {
        const filename = imagePath.replace(/^\/uploads\//, '')
        const localFilePath = path.join(uploadsDir, filename)
        if (!existsSync(localFilePath)) {
          missingFiles.push(filename)
        }
      }
    }

    if (missingFiles.length === 0) {
      // eslint-disable-next-line no-console
      console.log('[Sync Uploads] Tất cả ảnh upload đã đầy đủ ở local.')
      return
    }

    // eslint-disable-next-line no-console
    console.log(
      `[Sync Uploads] Phát hiện ${missingFiles.length} ảnh bị thiếu. Bắt đầu tải từ ${cleanSourceUrl}...`
    )

    let successCount = 0
    let failCount = 0

    // Download missing files
    for (const filename of missingFiles) {
      const remoteUrl = `${cleanSourceUrl}/uploads/${filename}`
      try {
        const res = await fetch(remoteUrl)
        if (res.ok) {
          const arrayBuffer = await res.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)
          await saveFileWithBackup(filename, buffer)
          successCount++
          // eslint-disable-next-line no-console
          console.log(`[Sync Uploads] [${successCount}/${missingFiles.length}] Đã tải: ${filename}`)
        } else {
          failCount++
          // eslint-disable-next-line no-console
          console.error(
            `[Sync Uploads] Không thể tải ${filename}: HTTP ${res.status}`
          )
        }
      } catch (err) {
        failCount++
        // eslint-disable-next-line no-console
        console.error(`[Sync Uploads] Lỗi tải ${filename}: ${err.message}`)
      }
    }

    // eslint-disable-next-line no-console
    console.log(
      `[Sync Uploads] Hoàn tất đồng bộ. Thành công: ${successCount}, Thất bại: ${failCount}`
    )
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[Sync Uploads] Lỗi nghiêm trọng khi đồng bộ ảnh:', err)
  }
}
