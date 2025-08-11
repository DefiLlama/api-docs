import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import path from 'path'
import fs from 'fs'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    {
      name: 'serve-llms-txt',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/llms.txt') {
            const filePath = path.resolve(__dirname, '../../llms.txt')
            if (fs.existsSync(filePath)) {
              res.setHeader('Content-Type', 'text/plain')
              fs.createReadStream(filePath).pipe(res)
            } else {
              res.statusCode = 404
              res.end('Not Found')
            }
          } else {
            next()
          }
        })
      },
    },
  ],
  server: {
    port: 5050,
    open: true,
  },
})
