export function requiredMessage(fieldLabel: string) {
  return `${fieldLabel} là trường bắt buộc.`
}

export function isBlank(value: unknown) {
  return String(value ?? '').trim() === ''
}
