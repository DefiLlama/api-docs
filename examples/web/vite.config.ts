import vue from '@vitejs/plugin-vue'
import { defineConfig, type Plugin } from 'vite'
import { resolve } from 'path'
import { readFileSync, existsSync, mkdirSync, copyFileSync } from 'fs'
import { crawlerResourceBudgetPlugin } from './src/crawler-resource-budget'

/**
 * Files at the repo root that are served as-is at the site root, since llms.txt links to them.
 * Read on each dev request so edits show up without a restart.
 */
const ROOT_FILES: Record<string, string> = {
  'llms.txt': 'text/plain; charset=utf-8',
  'llms-free.txt': 'text/plain; charset=utf-8',
  'llms-pro.txt': 'text/plain; charset=utf-8',
  'defillama-openapi-free.json': 'application/json; charset=utf-8',
  'defillama-openapi-pro.json': 'application/json; charset=utf-8',
}

function llmsTxtPlugin(): Plugin {
  const rootPath = (name: string): string => resolve(__dirname, '../..', name)

  return {
    name: 'llms-txt-plugin',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const name = req.url?.split('?')[0].slice(1) ?? ''
        const contentType = ROOT_FILES[name]
        if (!contentType) {
          next()
          return
        }
        res.setHeader('Content-Type', contentType)
        res.end(readFileSync(rootPath(name), 'utf-8'))
      })
    },
    closeBundle() {
      const outputDir = resolve(__dirname, 'dist')
      if (!existsSync(outputDir)) {
        mkdirSync(outputDir, { recursive: true })
      }
      for (const name of Object.keys(ROOT_FILES)) {
        copyFileSync(rootPath(name), resolve(outputDir, name))
      }
      console.log(`✓ Copied ${Object.keys(ROOT_FILES).join(', ')} to dist/`)
    },
  }
}

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [llmsTxtPlugin(), vue(), crawlerResourceBudgetPlugin()],
  server: {
    port: 5050,
    open: true,
  },
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks(moduleId) {
          if (/\/defillama-openapi-(free|pro)\.json$/.test(moduleId)) {
            return 'api-specifications'
          }
          if (moduleId.includes('/node_modules/')) {
            return 'vendor'
          }
        },
      },
    },
  },
})
