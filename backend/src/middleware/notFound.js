import { fail } from '../utils/response.js'

export function notFound(req, res) {
  return fail(res, 404, {
    code: 'NOT_FOUND',
    message: `Route not found: ${req.method} ${req.originalUrl}`,
  })
}

