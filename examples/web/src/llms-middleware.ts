/**
 * Middleware to detect AI/LLM requests and serve llms.txt content
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

const AI_USER_AGENTS = [
  'anthropic-ai',
  'claude',
  'openai',
  'gptbot',
  'chatgpt',
  'bingbot',
  'googlebot',
  'google-extended',
  'perplexitybot',
  'amazonbot',
  'meta-externalagent',
  'cohere-ai',
  'diffbot',
  'curl',
  'wget',
  'Claude-SearchBot',
  'Claude-User',
  'ClaudeBot',
]

export function isAIUserAgent(userAgent: string | undefined): boolean {
  if (!userAgent) return false
  const ua = userAgent.toLowerCase()
  return AI_USER_AGENTS.some((agent) => ua.includes(agent))
}

export type LlmsMiddleware = (req: any, res: any, next: () => void) => void

export type LlmsFiles = {
  'llms.txt': string
  'llms-free.txt': string
  'llms-pro.txt': string
}

export function llmsMiddleware(files: LlmsFiles): LlmsMiddleware {
  return (req, res, next) => {
    const userAgent = req.headers['user-agent']
    const filename = req.url?.replace(/^\//, '') as keyof LlmsFiles

    if (filename in files) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.end(files[filename])
      return
    }

    if (req.url === '/' && isAIUserAgent(userAgent)) {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8')
      res.setHeader('X-Served-As', 'llms.txt')
      res.end(files['llms.txt'])
      return
    }

    next()
  }
}
