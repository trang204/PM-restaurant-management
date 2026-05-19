export function requiredMessage(fieldLabel: string) {
  return `${fieldLabel} là trường bắt buộc.`
}

export function isBlank(value: unknown) {
  return String(value ?? '').trim() === ''
}

/** Chuẩn hoá SĐT: bỏ dấu chấm, gạch ngang, khoảng trắng */
export function normalizePhone(raw: string): string {
  return raw.trim().replace(/[\s.\-]/g, '')
}

/**
 * Validate SĐT Việt Nam.
 * Hợp lệ: 0[3|5|7|8|9]xxxxxxxx (10 số) hoặc +84[3|5|7|8|9]xxxxxxxx
 * Trả về null nếu hợp lệ, hoặc chuỗi lỗi nếu không hợp lệ.
 */
export function validatePhone(raw: string): string | null {
  const phone = normalizePhone(raw)
  if (!phone) return 'Số điện thoại là trường bắt buộc.'
  // Cho phép: 0[35789]xxxxxxxx hoặc +84[35789]xxxxxxxx (sau đầu số là 8 chữ số)
  if (!/^(?:\+?84|0)[35789]\d{8}$/.test(phone)) {
    return 'Số điện thoại không hợp lệ (VD: 0901234567 hoặc +84901234567).'
  }
  return null
}

/**
 * Validate email — chỉ kiểm tra format, không block domain hợp lệ.
 * - TLD: 2–6 ký tự chữ cái — bắt lỗi ".om", ".c"
 * - Domain name: ≥2 ký tự
 * Trả về null nếu hợp lệ, hoặc chuỗi lỗi.
 */

export function validatePassword(raw: string): string | null {
  const password = raw.trim()
  if (!password) return 'Mật khẩu là trường bắt buộc.'
  if (password.length < 6) return 'Mật khẩu tối thiểu 6 ký tự.'
  if (password.length > 100) return 'Mật khẩu tối đa 100 ký tự.'
  if (!/[a-z]/.test(password)) return 'Mật khẩu phải có ít nhất 1 ký tự thường.'
  if (!/[A-Z]/.test(password)) return 'Mật khẩu phải có ít nhất 1 ký tự hoa.'
  if (!/[0-9]/.test(password)) return 'Mật khẩu phải có ít nhất 1 chữ số.'
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return 'Mật khẩu phải có ít nhất 1 ký tự đặc biệt.'
  return null
}

export function validateEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase()
  if (!email) return 'Email là trường bắt buộc.'


  const atIdx = email.lastIndexOf('@')
  if (atIdx < 1) return 'Email không hợp lệ (VD: tenban@gmail.com).'

  const local = email.slice(0, atIdx)
  const domain = email.slice(atIdx + 1)

  if (!local || /\s/.test(local)) return 'Email không hợp lệ (VD: tenban@gmail.com).'

  if (!domain || /\s/.test(domain) || domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) {
    return 'Email không hợp lệ (VD: tenban@gmail.com).'
  }

  const parts = domain.split('.')
  if (parts.length < 2) return 'Email không hợp lệ (VD: tenban@gmail.com).'

  const tld = parts[parts.length - 1]
  const domainName = parts[parts.length - 2]

  if (!/^[a-z]{2,6}$/.test(tld)) {
    return 'Email không hợp lệ — đuôi email phải là .com, .vn, .net… (VD: tenban@gmail.com).'
  }

  if (!domainName || domainName.length < 2) {
    return 'Email không hợp lệ (VD: tenban@gmail.com).'
  }

  return null
}

