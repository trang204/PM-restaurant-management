
import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'

import { notFound } from './middleware/notFound.js'
import { errorHandler } from './middleware/errorHandler.js'
import routes from './routes/index.js'
import { ok } from './utils/response.js'

dotenv.config()

export function createServer() {
  const app = express()

  app.use(cors())
  app.use(express.json())

  app.get('/health', (req, res) => {
    return ok(res, { service: 'luxeat-api', status: 'ok' })
  })

  app.use('/api', routes)

  app.use(notFound)
  app.use(errorHandler)

  return app
}