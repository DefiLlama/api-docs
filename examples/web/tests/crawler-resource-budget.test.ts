import { describe, expect, it } from 'vitest'
import { assertCrawlerResourceSize, MAX_CRAWLER_RESOURCE_BYTES } from '../src/crawler-resource-budget'

describe('crawler resource budget', () => {
  it.each(['assets/index.js', 'assets/index.css', 'index.html'])('rejects oversized %s', (filename) => {
    expect(() => assertCrawlerResourceSize(filename, 'x'.repeat(MAX_CRAWLER_RESOURCE_BYTES + 1))).toThrow(
      'exceeding the 2000000-byte crawler resource budget',
    )
  })

  it('accepts resources within the byte limit', () => {
    expect(() => assertCrawlerResourceSize('assets/index.js', 'x'.repeat(MAX_CRAWLER_RESOURCE_BYTES))).not.toThrow()
  })

  it('counts UTF-8 bytes rather than characters', () => {
    expect(() => assertCrawlerResourceSize('assets/index.js', 'é'.repeat(MAX_CRAWLER_RESOURCE_BYTES / 2 + 1))).toThrow()
  })

  it('checks binary CSS assets', () => {
    expect(() => assertCrawlerResourceSize('assets/index.css', new Uint8Array(MAX_CRAWLER_RESOURCE_BYTES + 1))).toThrow()
  })

  it('does not apply the text resource budget to images', () => {
    expect(() => assertCrawlerResourceSize('image.png', new Uint8Array(MAX_CRAWLER_RESOURCE_BYTES + 1))).not.toThrow()
  })
})
