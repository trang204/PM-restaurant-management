export class HttpError extends Error {
  /**
   * @param {number} status
   * @param {string} code
   * @param {string} message
   * @param {unknown=} details
   */
  constructor(status, code, message, details) {
    super(message)
    this.name = 'HttpError'
    this.status = status
    this.code = code
    this.details = details
  }
}

export function badRequest(message, details) {
  return new HttpError(400, 'BAD_REQUEST', message, details)
}

export function unauthorized(message = 'Unauthorized') {
  return new HttpError(401, 'UNAUTHORIZED', message)
}

export function forbidden(message = 'Forbidden') {
  return new HttpError(403, 'FORBIDDEN', message)
}

export function notFound(message = 'Not found') {
  return new HttpError(404, 'NOT_FOUND', message)
}

