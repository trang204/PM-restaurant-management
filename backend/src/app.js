import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { notFound } from './middleware/notFound.js'
import { errorHandler } from './middleware/errorHandler.js'
import routes from './routes/index.js'
import { ok } from './utils/response.js'

// Import Swagger theo chuẩn ES Modules
import { swaggerUi, specs } from './utils/swagger.js'

dotenv.config({ quiet: true })

export function createServer() {
  const app = express()
  const __dirname = path.dirname(fileURLToPath(import.meta.url))

  // Middlewares cấu hình hệ thống
  app.use(cors())
  app.use(express.json())
  app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')))

  // Tuyến đường hiển thị tài liệu Swagger UI
  app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs))

  // Kiểm tra trạng thái server
  app.get('/health', (req, res) => {
    return ok(res, { service: 'luxeat-api', status: 'ok' })
  })

  // Các tuyến đường API chính của ứng dụng
  app.use('/api', routes)

  // Middlewares xử lý lỗi (Luôn đặt ở cuối cùng)
  app.use(notFound)
  app.use(errorHandler)

  return app
}
