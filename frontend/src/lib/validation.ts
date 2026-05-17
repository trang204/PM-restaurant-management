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

/** Levenshtein distance đơn giản (dùng nội bộ). */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] = a[i - 1] === b[j - 1]
        ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
    }
  }
  return dp[m][n]
}

/**
 * Danh sách domain email phổ biến.
 * Nếu user nhập domain sai 1-2 ký tự so với các domain này → báo typo.
 */
const COMMON_EMAIL_DOMAINS = [
  'gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com',
  'icloud.com', 'live.com', 'mail.com', 'protonmail.com',
  'ymail.com', 'googlemail.com',
]

/**
 * Validate email với regex chặt + phát hiện typo domain phổ biến.
 * - Local part (trước @): ≥1 ký tự, không có khoảng trắng
 * - Domain: ≥2 ký tự
 * - TLD: 2–6 ký tự CHỈ chữ cái (không số) — bắt được lỗi như gmail.om, gmail.c
 * - Không có dấu chấm đôi (..) hoặc chấm đầu/cuối domain
 * - Phát hiện typo: gmak.com, gmeil.com, yahooo.com…
 * Trả về null nếu hợp lệ, hoặc chuỗi lỗi nếu không hợp lệ.
 */
export function validateEmail(raw: string): string | null {
  const email = raw.trim().toLowerCase()
  if (!email) return 'Email là trường bắt buộc.'

  // Tách local@domain
  const atIdx = email.lastIndexOf('@')
  if (atIdx < 1) return 'Email không hợp lệ (VD: tenban@gmail.com).'

  const local = email.slice(0, atIdx)   // phần trước @
  const domain = email.slice(atIdx + 1) // phần sau @

  // Local part: không được rỗng, không chứa khoảng trắng
  if (!local || /\s/.test(local)) return 'Email không hợp lệ (VD: tenban@gmail.com).'

  // Domain: không chứa khoảng trắng, không bắt đầu/kết thúc bằng dấu chấm, không có ".."
  if (!domain || /\s/.test(domain) || domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) {
    return 'Email không hợp lệ (VD: tenban@gmail.com).'
  }

  // Tách domain thành phần và TLD
  const parts = domain.split('.')
  if (parts.length < 2) return 'Email không hợp lệ (VD: tenban@gmail.com).'

  const tld = parts[parts.length - 1]
  const domainName = parts[parts.length - 2]

  // TLD: chỉ chữ cái (a-z), dài 2–6 ký tự — bắt lỗi ".om", ".c", ".123"
  if (!/^[a-z]{2,6}$/.test(tld)) {
    return 'Email không hợp lệ — đuôi email phải là .com, .vn, .net… (VD: tenban@gmail.com).'
  }

  // Domain name (phần trước TLD): ít nhất 2 ký tự — bắt lỗi "x@g.com"
  if (!domainName || domainName.length < 2) {
    return 'Email không hợp lệ (VD: tenban@gmail.com).'
  }

  // Phát hiện typo domain: so sánh với các domain phổ biến
  // Nếu distance ≤ 2 nhưng không khớp chính xác → nhiều khả năng là typo
  for (const known of COMMON_EMAIL_DOMAINS) {
    if (domain === known) break // khớp chính xác → hợp lệ
    const dist = levenshtein(domain, known)
    if (dist > 0 && dist <= 2) {
      return `Email có thể nhập sai — bạn có muốn dùng @${known} không?`
    }
  }

  return null
}

