import { ok } from '../../utils/response.js'
import { badRequest } from '../../utils/httpError.js'
import { query } from '../../config/db.js'
import { analyzeTableLayoutImage } from '../../services/tableLayoutVision.service.js'

export async function analyzeImage(req, res, next) {
  try {
    const file = req.file
    if (!file) throw badRequest('Cần tải ảnh mặt bằng')

    const tablesRes = await query('SELECT id FROM tables ORDER BY id ASC')
    const tableCount = tablesRes.rows.length
    if (!tableCount) throw badRequest('Chưa có bàn nào trong hệ thống để tạo sơ đồ')

    const result = await analyzeTableLayoutImage({ file, tableCount })
    return ok(res, {
      ...result,
      tableCount,
      mode: 'layout_only',
    })
  } catch (e) {
    return next(e)
  }
}
