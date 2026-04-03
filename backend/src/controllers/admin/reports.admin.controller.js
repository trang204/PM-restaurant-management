import { ok } from '../../utils/response.js'

export async function revenue(req, res, next) {
  try {
    const { from, to, groupBy = 'day' } = req.query || {}
    return ok(res, {
      from: from || null,
      to: to || null,
      groupBy,
      total: 0,
      series: [],
    })
  } catch (e) {
    return next(e)
  }
}

