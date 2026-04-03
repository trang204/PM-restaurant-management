import { createServer } from './app.js'

const app = createServer()

const PORT = Number(process.env.PORT || 5000)
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Server running on port ${PORT}`)
})

