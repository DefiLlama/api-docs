/**
 * Middleware to serve llms.txt files on explicit requests
 *
 * Usage with Express:
 * ```ts
 * import { llmsMiddleware } from './llms-middleware'
 * app.use(llmsMiddleware({
 *   'llms.txt': llmsIndex,
 *   'llms-free.txt': llmsFree,
 *   'llms-pro.txt': llmsPro,
 * }))
 * ```
 */

export type LlmsMiddleware = (req: any, res: any, next: () => void) => void

export type LlmsFiles = {
  'llms.txt': string
  'llms-free.txt': string
  'llms-pro.txt': string
}

export function llmsMiddleware(files: LlmsFiles): LlmsMiddleware {
  return (req, res, next) => {
    const filename = req.url?.replace(/^\//, '') as keyof LlmsFiles

    if (filename in files) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.end(files[filename])
      return
    }

    next()
  }
}
