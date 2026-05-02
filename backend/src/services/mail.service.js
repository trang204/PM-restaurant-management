import nodemailer from 'nodemailer'

let cachedTransport = null
let cachedMode = null
let cachedKey = null

function readMailConfig() {
  const host = String(process.env.SMTP_HOST || '').trim()
  const user = String(process.env.SMTP_USER || '').trim()
  const pass = String(process.env.SMTP_PASS || '').trim()
  const port = Number(process.env.SMTP_PORT || 587)
  const secure = String(process.env.SMTP_SECURE || '').trim() === 'true' || port === 465
  return { host, user, pass, port, secure }
}

async function createTransport(config) {
  const { host, user, pass, port, secure } = config

  if (host && user && pass) {
    cachedMode = 'smtp'
    return nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass },
    })
  }

  cachedMode = 'json'
  return nodemailer.createTransport({ jsonTransport: true })
}

async function getTransport() {
  const config = readMailConfig()
  const nextKey = JSON.stringify({
    host: config.host,
    user: config.user,
    pass: config.pass,
    port: config.port,
    secure: config.secure,
  })
  if (!cachedTransport || cachedKey !== nextKey) {
    cachedTransport = await createTransport(config)
    cachedKey = nextKey
  }
  return cachedTransport
}

export async function getMailRuntimeInfo() {
  const config = readMailConfig()
  return {
    mode: config.host && config.user && config.pass ? 'smtp' : 'preview',
    host: config.host || null,
    port: config.port,
    secure: config.secure,
    user: config.user || null,
    hasPassword: Boolean(config.pass),
  }
}

export async function sendResetPasswordEmail({ to, resetUrl, restaurantName }) {
  const transport = await getTransport()
  const config = readMailConfig()
  const from = String(process.env.MAIL_FROM || config.user || 'no-reply@luxeat.local').trim()
  const appName = restaurantName?.trim() || 'Luxeat'
  const info = await transport.sendMail({
    from,
    to,
    subject: `${appName} - Dat lai mat khau`,
    text: [
      `Xin chao,`,
      ``,
      `Chung toi da nhan duoc yeu cau dat lai mat khau cho tai khoan ${to}.`,
      `Nhan vao lien ket sau de dat mat khau moi:`,
      resetUrl,
      ``,
      `Lien ket nay se het han sau 30 phut.`,
      `Neu ban khong yeu cau, hay bo qua email nay.`,
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
        <h2 style="margin:0 0 12px">${appName}</h2>
        <p>Chung toi da nhan duoc yeu cau dat lai mat khau cho tai khoan <strong>${to}</strong>.</p>
        <p>
          <a href="${resetUrl}" style="display:inline-block;padding:10px 16px;background:#8b6e41;color:#fff;text-decoration:none;border-radius:8px">
            Dat lai mat khau
          </a>
        </p>
        <p>Hoac mo lien ket sau trong trinh duyet:</p>
        <p><a href="${resetUrl}">${resetUrl}</a></p>
        <p>Lien ket nay se het han sau 30 phut.</p>
        <p>Neu ban khong yeu cau, hay bo qua email nay.</p>
      </div>
    `,
  })

  let previewUrl = null
  if (cachedMode === 'json') {
    const message = typeof info.message === 'string' ? info.message : JSON.stringify(info.message)
    // eslint-disable-next-line no-console
    console.log('[mail:preview]', message)
    previewUrl = 'Xem noi dung email trong console server ([mail:preview]).'
  } else {
    previewUrl = nodemailer.getTestMessageUrl(info) || null
  }

  return { previewUrl }
}

export async function sendTestEmail({ to, restaurantName }) {
  const transport = await getTransport()
  const config = readMailConfig()
  const from = String(process.env.MAIL_FROM || config.user || 'no-reply@luxeat.local').trim()
  const appName = restaurantName?.trim() || 'Luxeat'
  const info = await transport.sendMail({
    from,
    to,
    subject: `${appName} - Kiem tra cau hinh email`,
    text: [
      `Xin chao,`,
      ``,
      `Day la email kiem tra tu he thong ${appName}.`,
      `Neu ban nhan duoc email nay, cau hinh gui mail da hoat dong.`,
    ].join('\n'),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#1f2937">
        <h2 style="margin:0 0 12px">${appName}</h2>
        <p>Day la email kiem tra tu he thong <strong>${appName}</strong>.</p>
        <p>Neu ban nhan duoc email nay, cau hinh gui mail da hoat dong.</p>
      </div>
    `,
  })

  if (cachedMode === 'json') {
    const message = typeof info.message === 'string' ? info.message : JSON.stringify(info.message)
    // eslint-disable-next-line no-console
    console.log('[mail:test-preview]', message)
    return { previewUrl: 'Xem noi dung email test trong console server ([mail:test-preview]).' }
  }

  return { previewUrl: nodemailer.getTestMessageUrl(info) || null }
}
