export function ok(res, data, meta) {
  return res.status(200).json({ success: true, data, meta })
}

export function created(res, data, meta) {
  return res.status(201).json({ success: true, data, meta })
}

export function fail(res, status, error) {
  return res.status(status).json({ success: false, error })
}

