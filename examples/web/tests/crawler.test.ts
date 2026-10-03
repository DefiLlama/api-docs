import { describe, expect, it, vi } from 'vitest'
import { onRequest } from '../functions/_middleware'

describe('docs crawler responses', () => {
  it.each(['Googlebot', 'bingbot', 'curl/8.0'])('serves the HTML page to %s', async (userAgent) => {
    const next = vi.fn(async () => new Response('<html>DefiLlama API documentation</html>', {
      headers: { 'Content-Type': 'text/html' },
    }))

    const response = await onRequest({
      request: new Request('https://api-docs.defillama.com/', {
        headers: { 'User-Agent': userAgent },
      }),
      next,
      env: {},
    })

    expect(next).toHaveBeenCalledOnce()
    expect(response.headers.get('Content-Type')).toBe('text/html')
    expect(await response.text()).toContain('DefiLlama API documentation')
  })

  it('continues serving llms.txt to AI crawlers', async () => {
    const next = vi.fn()
    const originalFetch = globalThis.fetch
    globalThis.fetch = vi.fn(async () => new Response('# DefiLlama API'))

    try {
      const response = await onRequest({
        request: new Request('https://api-docs.defillama.com/', {
          headers: { 'User-Agent': 'ClaudeBot' },
        }),
        next,
        env: {},
      })

      expect(next).not.toHaveBeenCalled()
      expect(response.headers.get('X-Served-As')).toBe('llms.txt')
      expect(await response.text()).toBe('# DefiLlama API')
    } finally {
      globalThis.fetch = originalFetch
    }
  })
})
