import { createServer } from './app.js'

const app = createServer()

const PORT = Number(process.env.PORT || 5000)
const HOST = process.env.HOST?.trim() || undefined

function onListening() {
  // eslint-disable-next-line no-console
  console.log(
    HOST ? `Server running on http://${HOST}:${PORT}` : `Server running on port ${PORT}`,
  )
}

if (HOST) {
  app.listen(PORT, HOST, onListening)
} else {
  app.listen(PORT, onListening)
}
