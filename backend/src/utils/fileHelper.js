import fs from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const UPLOAD_DIR = path.resolve(__dirname, '../../uploads')
const BACKUP_DIR = path.resolve(__dirname, '../../uploads_backup')

/**
 * Saves a file to the uploads directory and creates a backup copy.
 * @param {string} filename The name of the file to save
 * @param {Buffer} buffer The file buffer
 */
export async function saveFileWithBackup(filename, buffer) {
  // Ensure both directories exist
  await fs.mkdir(UPLOAD_DIR, { recursive: true })
  await fs.mkdir(BACKUP_DIR, { recursive: true })

  const uploadPath = path.join(UPLOAD_DIR, filename)
  const backupPath = path.join(BACKUP_DIR, filename)

  // Write to uploads
  await fs.writeFile(uploadPath, buffer)

  // Write to backup
  try {
    await fs.writeFile(backupPath, buffer)
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[Backup] Failed to backup file ${filename}:`, err)
  }
}

/**
 * Syncs files between backup and uploads.
 * If a file exists in uploads_backup but is missing in uploads, it is copied over.
 */
export async function syncLocalBackup() {
  if (!existsSync(BACKUP_DIR)) {
    return
  }

  try {
    await fs.mkdir(UPLOAD_DIR, { recursive: true })
    const backupFiles = await fs.readdir(BACKUP_DIR)
    let copiedCount = 0

    for (const filename of backupFiles) {
      const uploadPath = path.join(UPLOAD_DIR, filename)
      const backupPath = path.join(BACKUP_DIR, filename)

      try {
        const stat = await fs.stat(backupPath)
        if (!stat.isFile()) continue

        if (!existsSync(uploadPath)) {
          await fs.copyFile(backupPath, uploadPath)
          copiedCount++
          // eslint-disable-next-line no-console
          console.log(`[Backup Sync] Restored missing file from backup: ${filename}`)
        }
      } catch (statErr) {
        // ignore errors on individual files
      }
    }

    if (copiedCount > 0) {
      // eslint-disable-next-line no-console
      console.log(`[Backup Sync] Đã khôi phục ${copiedCount} ảnh từ uploads_backup sang uploads.`)
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[Backup Sync] Lỗi khi đồng bộ từ uploads_backup:', err)
  }
}
