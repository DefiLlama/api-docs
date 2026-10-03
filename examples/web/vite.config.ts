import vue from '@vitejs/plugin-vue'
import { defineConfig, type Plugin } from 'vite'
import { resolve } from 'path'
import { readFileSync, existsSync, mkdirSync, copyFileSync } from 'fs'

function llmsTxtPlugin(): Plugin {
  let llmsContent: string
  let llmsFreeContent: string
  let llmsProContent: string
  const llmsPath = resolve(__dirname, '../../llms.txt')
  const llmsFreePath = resolve(__dirname, '../../llms-free.txt')
  const llmsProPath = resolve(__dirname, '../../llms-pro.txt')

  return {
    name: 'llms-txt-plugin',
    configureServer(server) {
      llmsContent = readFileSync(llmsPath, 'utf-8')
      llmsFreeContent = readFileSync(llmsFreePath, 'utf-8')
      llmsProContent = readFileSync(llmsProPath, 'utf-8')

      server.middlewares.use((req, res, next) => {
        if (req.url === '/llms.txt') {
          res.setHeader('Content-Type', 'text/plain; charset=utf-8')
          res.end(llmsContent)
          return
        }

        if (req.url === '/llms-free.txt') {
          res.setHeader('Content-Type', 'text/plain; charset=utf-8')
          res.end(llmsFreeContent)
          return
        }

        if (req.url === '/llms-pro.txt') {
          res.setHeader('Content-Type', 'text/plain; charset=utf-8')
          res.end(llmsProContent)
          return
        }

        next()
      })
    },
    closeBundle() {
      // Copy llms.txt to dist/ after build completes
      const outputDir = resolve(__dirname, 'dist')
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true })
      }
      copyFileSync(llmsPath, resolve(outputDir, 'llms.txt'))
      copyFileSync(llmsFreePath, resolve(outputDir, 'llms-free.txt'))
      copyFileSync(llmsProPath, resolve(outputDir, 'llms-pro.txt'))
      console.log('✓ Copied llms.txt, llms-free.txt, and llms-pro.txt to dist/')
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [llmsTxtPlugin(), vue()],
  server: {
    port: 5050,
    open: true,
  },
  build: {
    outDir: 'dist',
  },
})
