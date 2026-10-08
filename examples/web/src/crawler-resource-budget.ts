import type { Plugin } from 'vite'

export const MAX_CRAWLER_RESOURCE_BYTES = 2_000_000

export function assertCrawlerResourceSize(filename: string, content: string | Uint8Array): void {
  if (!/\.(html|css|js)$/.test(filename)) return

  const bytes = Buffer.byteLength(content)
  if (bytes > MAX_CRAWLER_RESOURCE_BYTES) {
    throw new Error(
      `${filename} is ${bytes} uncompressed bytes, exceeding the ${MAX_CRAWLER_RESOURCE_BYTES}-byte crawler resource budget`,
    )
  }
}

export function crawlerResourceBudgetPlugin(): Plugin {
  return {
    name: 'crawler-resource-budget',
    generateBundle(_options, bundle) {
      for (const output of Object.values(bundle)) {
        assertCrawlerResourceSize(output.fileName, output.type === 'chunk' ? output.code : output.source)
      }
    },
  }
}
