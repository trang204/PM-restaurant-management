import nodemailer from 'nodemailer'

let cachedTransport = null
let cachedMode = null
let cachedKey = null

/**
 * Đọc cấu hình SMTP từ .env
 */
function readMailConfig() {
  const host = String(process.env.SMTP_HOST || '').trim()

  const user = String(process.env.SMTP_USER || '').trim()

  const pass = String(process.env.SMTP_PASS || '').trim()

  const port = Number(process.env.SMTP_PORT || 587)

  const secure =
    String(process.env.SMTP_SECURE || '').trim() === 'true' ||
    port === 465

  return {
    host,
    user,
    pass,
    port,
    secure,
  }
}

/**
 * Tạo transport gửi mail
 */
async function createTransport(config) {
  const {
    host,
    user,
    pass,
    port,
    secure,
  } = config

  // SMTP thật
  if (host && user && pass) {
    cachedMode = 'smtp'

    return nodemailer.createTransport({
      host,
      port,
      secure,

      auth: {
        user,
        pass,
      },
    })
  }

  // Chế độ test local
  cachedMode = 'json'

  return nodemailer.createTransport({
    jsonTransport: true,
  })
}

/**
 * Lấy transport cache
 */
async function getTransport() {
  const config = readMailConfig()

  const nextKey = JSON.stringify({
    host: config.host,
    user: config.user,
    pass: config.pass,
    port: config.port,
    secure: config.secure,
  })

  // Nếu config thay đổi thì tạo lại
  if (!cachedTransport || cachedKey !== nextKey) {
    cachedTransport = await createTransport(config)
    cachedKey = nextKey
  }

  return cachedTransport
}

/**
 * Kiểm tra cấu hình mail runtime
 */
export async function getMailRuntimeInfo() {
  const config = readMailConfig()

  return {
    mode:
      config.host &&
        config.user &&
        config.pass
        ? 'smtp'
        : 'preview',

    host: config.host || null,

    port: config.port,

    secure: config.secure,

    user: config.user || null,

    hasPassword: Boolean(config.pass),
  }
}

/**
 * Gửi email đặt lại mật khẩu
 */
export async function sendResetPasswordEmail({
  to,
  resetUrl,
  restaurantName,
}) {
  const transport = await getTransport()

  const config = readMailConfig()

  const from = String(
    process.env.MAIL_FROM ||
    config.user ||
    'no-reply@luxeat.local'
  ).trim()

  const appName =
    restaurantName?.trim() || 'Luxeat'

  const info = await transport.sendMail({
    from,
    to,

    subject: `${appName} - Đặt lại mật khẩu`,

    text: [
      `Xin chào,`,
      ``,
      `Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu cho tài khoản: ${to}`,
      ``,
      `Vui lòng truy cập liên kết bên dưới để tạo mật khẩu mới:`,
      resetUrl,
      ``,
      `⚠️ Liên kết này sẽ hết hạn sau 10 phút.`,
      ``,
      `Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email.`,
      ``,
      `Trân trọng,`,
      `${appName}`,
    ].join('\n'),

    html: `
      <div style="
        font-family: Arial, sans-serif;
        line-height: 1.7;
        color: #1f2937;
        max-width: 600px;
        margin: auto;
        padding: 24px;
      ">
        
        <h2 style="
          margin-bottom: 16px;
          color: #8b6e41;
        ">
          ${appName}
        </h2>

        <p>Xin chào,</p>

        <p>
          Chúng tôi đã nhận được yêu cầu
          <strong>đặt lại mật khẩu</strong>
          cho tài khoản:
        </p>

        <p>
          <strong>${to}</strong>
        </p>
        
        <p>
          Hoặc mở liên kết sau trong trình duyệt:
        </p>

        <p>
          <a href="${resetUrl}">
            ${resetUrl}
          </a>
        </p>

        <div style="
          margin-top: 20px;
          padding: 14px;
          border-radius: 8px;
          background: #fef3c7;
          color: #92400e;
        ">
          ⚠️ Liên kết này sẽ hết hạn sau <strong>10 phút</strong>.
        </div>

        <p style="margin-top: 20px">
          Nếu bạn không yêu cầu đặt lại mật khẩu,
          vui lòng bỏ qua email này.
        </p>

        <hr style="
          margin: 32px 0;
          border: none;
          border-top: 1px solid #e5e7eb;
        " />

        <p style="
          font-size: 14px;
          color: #6b7280;
        ">
          Email được gửi tự động từ hệ thống ${appName}.
        </p>

      </div>
    `,
  })

  let previewUrl = null

  // Chế độ preview local
  if (cachedMode === 'json') {
    const message =
      typeof info.message === 'string'
        ? info.message
        : JSON.stringify(info.message)

    console.log('[mail:preview]', message)

    previewUrl =
      'Xem nội dung email trong console server ([mail:preview]).'
  } else {
    previewUrl =
      nodemailer.getTestMessageUrl(info) || null
  }

  return {
    previewUrl,
  }
}

/**
 * Gửi email test cấu hình
 */
export async function sendTestEmail({
  to,
  restaurantName,
}) {
  const transport = await getTransport()

  const config = readMailConfig()

  const from = String(
    process.env.MAIL_FROM ||
    config.user ||
    'no-reply@luxeat.local'
  ).trim()

  const appName =
    restaurantName?.trim() || 'Luxeat'

  const info = await transport.sendMail({
    from,
    to,

    subject: `${appName} - Kiểm tra cấu hình email`,

    text: [
      `Xin chào,`,
      ``,
      `Đây là email kiểm tra từ hệ thống ${appName}.`,
      ``,
      `Nếu bạn nhận được email này,`,
      `cấu hình gửi email đã hoạt động thành công.`,
      ``,
      `Trân trọng,`,
      `${appName}`,
    ].join('\n'),

    html: `
      <div style="
        font-family: Arial, sans-serif;
        line-height: 1.7;
        color: #1f2937;
        max-width: 600px;
        margin: auto;
        padding: 24px;
      ">

        <h2 style="
          margin-bottom: 16px;
          color: #8b6e41;
        ">
          ${appName}
        </h2>

        <p>Xin chào,</p>

        <p>
          Đây là email kiểm tra từ hệ thống
          <strong>${appName}</strong>.
        </p>

        <p>
          Nếu bạn nhận được email này,
          cấu hình gửi email đã hoạt động thành công.
        </p>

        <div style="
          margin-top: 24px;
          padding: 16px;
          background: #f3f4f6;
          border-radius: 8px;
        ">
          ✅ Hệ thống gửi mail hoạt động bình thường.
        </div>

        <hr style="
          margin: 32px 0;
          border: none;
          border-top: 1px solid #e5e7eb;
        " />

        <p style="
          font-size: 14px;
          color: #6b7280;
        ">
          Email được gửi tự động từ hệ thống ${appName}.
        </p>

      </div>
    `,
  })

  // Chế độ preview local
  if (cachedMode === 'json') {
    const message =
      typeof info.message === 'string'
        ? info.message
        : JSON.stringify(info.message)

    console.log('[mail:test-preview]', message)

    return {
      previewUrl:
        'Xem nội dung email test trong console server ([mail:test-preview]).',
    }
  }

  return {
    previewUrl:
      nodemailer.getTestMessageUrl(info) || null,
  }
}

/**
 * Kiểm tra token reset password còn hạn hay không
 */
export function isResetTokenExpired(
  resetTokenExpiresAt,
) {
  return Date.now() > resetTokenExpiresAt
}