import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { createServer, type ViteDevServer } from 'vite'
import { fileURLToPath } from 'node:url'

let server: ViteDevServer
let baseUrl: string

beforeAll(async () => {
  server = await createServer({
    root: fileURLToPath(new URL('../', import.meta.url)),
    configFile: fileURLToPath(new URL('../vite.config.ts', import.meta.url)),
    server: { host: '127.0.0.1', port: 0, open: false },
  })
  await server.listen()

  const address = server.httpServer?.address()
  if (!address || typeof address === 'string') throw new Error('Vite server did not bind a port')
  baseUrl = `http://127.0.0.1:${address.port}`
})

afterAll(async () => {
  await server?.close()
})

describe('docs crawler responses', () => {
  it.each(['Googlebot', 'bingbot', 'PerplexityBot', 'Claude-SearchBot', 'curl/8.0', 'Mozilla/5.0'])(
    'serves the HTML homepage to %s',
    async (userAgent) => {
      const response = await fetch(baseUrl, { headers: { 'User-Agent': userAgent } })

      expect(response.status).toBe(200)
      expect(response.headers.get('Content-Type')).toContain('text/html')
      const content = await response.text()
      expect(content).toContain('<h1>DefiLlama API documentation</h1>')
      expect(content).toContain('rel="canonical"')
    },
  )

  it.each([
    ['/llms.txt', 'text/plain', '# DefiLlama API'],
    ['/llms-free.txt', 'text/plain', '# DefiLlama Free API'],
    ['/llms-pro.txt', 'text/plain', '# DefiLlama Pro API'],
    ['/robots.txt', 'text/plain', 'Sitemap: https://api-docs.defillama.com/sitemap.xml'],
    ['/sitemap.xml', 'xml', '<loc>https://api-docs.defillama.com/</loc>'],
  ])('serves %s as a crawler-readable asset', async (path, contentType, expectedText) => {
    const response = await fetch(`${baseUrl}${path}`, { headers: { 'User-Agent': 'Googlebot' } })

    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toContain(contentType)
    expect(await response.text()).toContain(expectedText)
  })
})
