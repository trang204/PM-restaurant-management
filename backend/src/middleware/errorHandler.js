import { fail } from '../utils/response.js'
import { HttpError } from '../utils/httpError.js'

export function errorHandler(err, req, res, next) {
  if (res.headersSent) return next(err)

  if (err instanceof HttpError) {
    return fail(res, err.status, {
      code: err.code,
      message: err.message,
      details: err.details,
    })
  }

  // eslint-disable-next-line no-console
  console.error(err)
  return fail(res, 500, {
    code: 'INTERNAL_SERVER_ERROR',
    message: 'Internal server error',
  })
}
