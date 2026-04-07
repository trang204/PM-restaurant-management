
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { notFound } from './middleware/notFound.js'
import { errorHandler } from './middleware/errorHandler.js'
import routes from './routes/index.js'
import { ok } from './utils/response.js'

dotenv.config({ quiet: true })

export function createServer() {
  const app = express()
  const __dirname = path.dirname(fileURLToPath(import.meta.url))

  app.use(cors())
  app.use(express.json())
  app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')))

  app.get('/health', (req, res) => {
    return ok(res, { service: 'luxeat-api', status: 'ok' })
  })

  app.use('/api', routes)

  app.use(notFound)
  app.use(errorHandler)

  return app
}