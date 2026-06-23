import path from 'node:path'
import { fileURLToPath } from 'node:url'
import swaggerJsdoc from 'swagger-jsdoc'
import swaggerUi from 'swagger-ui-express'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Luxeat API Documentation',
            version: '1.0.0',
            description: 'Tài liệu tích hợp hệ thống API dự án Luxeat',
        },
        servers: [
            {
                url: 'http://localhost:5000/api',
                description: 'Local server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Nhập token JWT với định dạng: Bearer [token]'
                }
            }
        }
    },
    apis: [
        path.join(__dirname, '../routes/*.js').replace(/\\/g, '/'),
        path.join(__dirname, '../routes/modules/*.js').replace(/\\/g, '/')
    ],
}

const specs = swaggerJsdoc(options)

export { swaggerUi, specs }

