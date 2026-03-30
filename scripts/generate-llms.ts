/**
 * Generates llms.txt, llms-free.txt, and llms-pro.txt from the OpenAPI JSON specs.
 *
 * Usage: npx tsx scripts/generate-llms.ts
 */
import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

const ROOT = join(import.meta.dirname, '..')

type Parameter = {
  name: string
  in: string
  required?: boolean
  description?: string
  schema?: {
    type?: string
    example?: unknown
    enum?: string[]
  }
}

type Endpoint = {
  path: string
  summary: string
  tag: string
  proOnly: boolean
  parameters: Parameter[]
  responseHint: string
}

/** Build a short one-line response hint from the OpenAPI response schema */
function summarizeResponse(response: any): string {
  if (!response) return ''
  const schema = response?.content?.['application/json']?.schema
  if (!schema) return ''

  if (schema.type === 'array' && schema.items?.type === 'object') {
    const keys = Object.keys(schema.items.properties ?? {})
    if (keys.length === 0) return 'Returns: array of objects'
    return `Returns: array of {${keys.join(', ')}}`
  }

  if (schema.type === 'object') {
    const keys = Object.keys(schema.properties ?? {})
    if (keys.length === 0) return 'Returns: object'
    return `Returns: {${keys.join(', ')}}`
  }

  if (schema.type === 'number' || schema.type === 'integer') {
    return 'Returns: number'
  }

  if (schema.type === 'string') {
    return 'Returns: string'
  }

  return ''
}

function loadEndpoints(filePath: string): Endpoint[] {
  const spec = JSON.parse(readFileSync(filePath, 'utf-8'))
  const endpoints: Endpoint[] = []

  for (const [path, methods] of Object.entries(spec.paths) as [string, Record<string, any>][]) {
    const get = methods.get
    if (!get) continue

    endpoints.push({
      path,
      summary: get.summary ?? '',
      tag: get.tags?.[0] ?? 'other',
      proOnly: get['x-api-plan-only'] === true,
      parameters: (get.parameters ?? []).map((p: any) => ({
        name: p.name,
        in: p.in,
        required: p.required,
        description: p.description,
        schema: p.schema,
      })),
      responseHint: summarizeResponse(get.responses?.['200']),
    })
  }

  return endpoints
}

function formatParam(p: Parameter): string {
  const req = p.required ? 'required' : 'optional'
  const type = p.schema?.type ?? 'string'
  const enumValues = p.schema?.enum ? ` (one of: ${p.schema.enum.join(', ')})` : ''
  const example = p.schema?.example != null ? ` Example: \`${p.schema.example}\`` : ''
  const desc = p.description ? ` — ${p.description}` : ''
  return `  - \`${p.name}\` (${p.in}, ${type}, ${req})${desc}${enumValues}${example}`
}

function formatEndpoint(e: Endpoint, baseUrl: string): string {
  const lines: string[] = []
  lines.push(`### GET ${e.path}`)
  lines.push(`**Base URL:** \`${baseUrl}\``)
  lines.push(`${e.summary}`)

  if (e.parameters.length > 0) {
    lines.push('')
    lines.push('**Parameters:**')
    for (const p of e.parameters) {
      lines.push(formatParam(p))
    }
  }

  if (e.responseHint) {
    lines.push(`${e.responseHint}`)
  }

  return lines.join('\n')
}

function groupByTag(endpoints: Endpoint[]): Map<string, Endpoint[]> {
  const groups = new Map<string, Endpoint[]>()
  for (const e of endpoints) {
    const tag = e.tag
    if (!groups.has(tag)) groups.set(tag, [])
    groups.get(tag)!.push(e)
  }
  return groups
}

/** Normalize tag names for display */
function formatTagName(tag: string): string {
  const map: Record<string, string> = {
    'TVL': 'TVL',
    'coins': 'Coins & Prices',
    'stablecoins': 'Stablecoins',
    'yields': 'Yields & APY',
    'volumes': 'DEX Volumes',
    'fees and revenue': 'Fees & Revenue',
    'perps': 'Perpetuals & Open Interest',
    'active users': 'Active Users',
    'Unlocks': 'Token Unlocks',
    'main page': 'Protocol Analytics',
    'token liquidity': 'Token Liquidity',
    'ETFs': 'ETFs',
    'meta': 'API Key Management',
    'narratives': 'Narratives',
    'bridges': 'Bridges',
    'DAT': 'Digital Asset Treasury',
    'Equities': 'Equities',
  }
  return map[tag] ?? tag
}

function generateIndex(freeEndpoints: Endpoint[], proEndpoints: Endpoint[], mappingTable: string): string {
  const freeGroups = groupByTag(freeEndpoints)
  const proGroups = groupByTag(proEndpoints)

  return `# DefiLlama API

> DefiLlama provides free, open-source DeFi analytics data. There are two separate APIs with different base URLs and authentication. Do NOT mix them.

## Important: Free API vs Pro API

The Free API and Pro API are entirely separate services.

| Feature | Free API | Pro API |
|---|---|---|
| Base URL | https://api.llama.fi | https://pro-api.llama.fi/{KEY} |
| Auth Required | No | Yes ($300/mo) |
| Rate Limit | Standard | Higher |
| Endpoints | ${freeEndpoints.length} | ${proEndpoints.length} exclusive + ${freeEndpoints.length} free with prefix |

Pro API authentication: insert your API key between the base URL and endpoint path:
\`\`\`
https://pro-api.llama.fi/{YOUR_API_KEY}/api/protocols
\`\`\`

Do NOT use \`pro-api.llama.fi\` without an API key. Do NOT put API keys in \`api.llama.fi\` URLs.

**Pro users accessing free endpoints:** Pro API key holders can also call free endpoints on \`pro-api.llama.fi\` for higher rate limits. Use the exact path mappings below.

## Free-to-Pro Path Mapping

Pro users: to call free endpoints with higher rate limits, use \`https://pro-api.llama.fi/{YOUR_API_KEY}\` with the pro path below.

${mappingTable}

## SDKs

**JavaScript** — \`npm install @defillama/api\` — [GitHub](https://github.com/DefiLlama/api-sdk)
**Python** — \`pip install defillama-sdk\` — [GitHub](https://github.com/DefiLlama/python-sdk)

## Free API Endpoints (api.llama.fi)

Full documentation: [llms-free.txt](/llms-free.txt)

No authentication required. Base URL: \`https://api.llama.fi\`

${Array.from(freeGroups.entries())
  .map(([tag, eps]) => `- **${formatTagName(tag)}**: ${eps.map((e) => `\`${e.path}\``).join(', ')}`)
  .join('\n')}

## Pro-Only API Endpoints (pro-api.llama.fi)

Full documentation: [llms-pro.txt](/llms-pro.txt)

Requires API key. Base URL: \`https://pro-api.llama.fi\`

${Array.from(proGroups.entries())
  .map(([tag, eps]) => `- **${formatTagName(tag)}**: ${eps.map((e) => `\`${e.path}\``).join(', ')}`)
  .join('\n')}

## Optional

- [OpenAPI spec (free)](/defillama-openapi-free.json): Full OpenAPI 3.0 specification for free endpoints
- [OpenAPI spec (pro)](/defillama-openapi-pro.json): Full OpenAPI 3.0 specification for pro endpoints
`
}

function generateDetailedFile(title: string, baseUrl: string, auth: string, endpoints: Endpoint[]): string {
  const groups = groupByTag(endpoints)

  const sections = Array.from(groups.entries())
    .map(([tag, eps]) => {
      const header = `## ${formatTagName(tag)}`
      const entries = eps.map((e) => formatEndpoint(e, baseUrl)).join('\n\n')
      return `${header}\n\n${entries}`
    })
    .join('\n\n---\n\n')

  return `# ${title}

> ${auth}

**Base URL for ALL endpoints below:** \`${baseUrl}\`

${sections}
`
}

/**
 * Builds an explicit mapping of every free endpoint path to its pro equivalent.
 * Pro users can call these on pro-api.llama.fi for higher rate limits.
 */
function buildFreeToProMapping(
  freeEndpoints: Endpoint[],
  allProEndpoints: Endpoint[],
): { freePath: string; proPath: string; summary: string }[] {
  const proPaths = new Set(allProEndpoints.map((e) => e.path))
  const mappings: { freePath: string; proPath: string; summary: string }[] = []

  const prefixes = ['/api/', '/coins/', '/stablecoins/', '/yields/']

  for (const free of freeEndpoints) {
    for (const prefix of prefixes) {
      const candidate = prefix + free.path.replace(/^\//, '')
      if (proPaths.has(candidate)) {
        mappings.push({ freePath: free.path, proPath: candidate, summary: free.summary })
        break
      }
    }
  }

  return mappings
}

function formatMappingTable(mappings: { freePath: string; proPath: string; summary: string }[]): string {
  const lines = ['| Free path (api.llama.fi) | Pro path (pro-api.llama.fi) | Description |', '|---|---|---|']
  for (const m of mappings) {
    lines.push(`| \`${m.freePath}\` | \`${m.proPath}\` | ${m.summary} |`)
  }
  return lines.join('\n')
}

function main(): void {
  const freeSpec = join(ROOT, 'defillama-openapi-free.json')
  const proSpec = join(ROOT, 'defillama-openapi-pro.json')

  const freeEndpoints = loadEndpoints(freeSpec)
  const allProEndpoints = loadEndpoints(proSpec)

  /** Pro-only endpoints: those marked x-api-plan-only OR not present in free spec */
  const freePaths = new Set(freeEndpoints.map((e) => e.path))
  const proOnlyEndpoints = allProEndpoints.filter((e) => {
    if (e.proOnly) return true
    /** Also exclude endpoints that mirror free ones (like /api/protocols mirrors /protocols) */
    const strippedPath = e.path
      .replace(/^\/api\//, '/')
      .replace(/^\/coins\//, '/')
      .replace(/^\/stablecoins\//, '/')
      .replace(/^\/yields\//, '/')
    return !freePaths.has(strippedPath) && !freePaths.has(e.path)
  })

  const freeToProMapping = buildFreeToProMapping(freeEndpoints, allProEndpoints)
  const mappingTable = formatMappingTable(freeToProMapping)

  const llmsIndex = generateIndex(freeEndpoints, proOnlyEndpoints, mappingTable)
  const llmsFree = generateDetailedFile(
    'DefiLlama Free API',
    'https://api.llama.fi',
    'Free API — no authentication required. All endpoints below use base URL https://api.llama.fi',
    freeEndpoints,
  )
  const proNote = `Pro API — requires a paid API key ($300/mo). Authentication: insert API key in URL path like https://pro-api.llama.fi/{YOUR_API_KEY}/endpoint. The pro-only endpoints below are NOT available on the free API.

Pro users can also call free endpoints with higher rate limits using the path mappings below.

## Free Endpoints Available on Pro (Higher Rate Limits)

Use base URL https://pro-api.llama.fi/{YOUR_API_KEY} with the pro path column.

${mappingTable}`

  const llmsPro = generateDetailedFile(
    'DefiLlama Pro API (Paid)',
    'https://pro-api.llama.fi',
    proNote,
    proOnlyEndpoints,
  )

  writeFileSync(join(ROOT, 'llms.txt'), llmsIndex)
  writeFileSync(join(ROOT, 'llms-free.txt'), llmsFree)
  writeFileSync(join(ROOT, 'llms-pro.txt'), llmsPro)

  console.log(`Generated:`)
  console.log(`  llms.txt      — ${llmsIndex.split('\n').length} lines`)
  console.log(`  llms-free.txt — ${llmsFree.split('\n').length} lines`)
  console.log(`  llms-pro.txt  — ${llmsPro.split('\n').length} lines`)
  console.log(`  Free endpoints: ${freeEndpoints.length}`)
  console.log(`  Pro-only endpoints: ${proOnlyEndpoints.length}`)
}

main()
