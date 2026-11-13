/**
 * Calls every GET operation in an OpenAPI spec with its example parameters and checks the
 * live 200 response against the documented schema.
 *
 * Usage: node scripts/check-spec-responses.ts [spec.json ...] [/path ...]
 *   Defaults to defillama-openapi-free.json. Paths limit the run to those operations.
 *   Operations on the pro server need DEFILLAMA_API_KEY and are skipped without it.
 *   Exits 1 when an operation fails, a path matches no operation, or nothing was checked.
 */
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'

type Schema = Record<string, any>

type Group = {
  count: number
  first: string
}

type Report = (pattern: string, at: string, message: string) => void

type Presence = {
  objects: number
  present: number
}

// Keywords outside these two sets are reported, so a schema never passes on a keyword this script ignores
const ENFORCED = new Set([
  'type',
  'nullable',
  'properties',
  'required',
  'additionalProperties',
  'items',
  'enum',
  'oneOf',
  'anyOf',
  'allOf',
  'minItems',
  'maxItems',
  'minimum',
  'maximum',
])
const ANNOTATIONS = new Set(['description', 'example', 'title', 'format', 'deprecated', 'default', 'externalDocs'])

const KEY_VARIABLE = '{YOUR_API_KEY}'

// One object can lack an optional key, so a documented key fails only when it is absent from this many or more
const MIN_OBJECTS = 10

function typeOf(value: unknown): string {
  if (value === null) return 'null'
  if (Array.isArray(value)) return 'array'
  if (typeof value === 'number') return Number.isInteger(value) ? 'integer' : 'number'
  return typeof value
}

// Walks the whole schema once, so a problem in a oneOf branch or in a part no response reaches is still reported
function lint(schema: unknown, pattern: string, report: Report) {
  if (!schema || typeof schema !== 'object' || Array.isArray(schema)) {
    report(pattern, pattern, 'schema is not an object')
    return
  }
  const node = schema as Schema
  for (const key of Object.keys(node)) {
    if (!ENFORCED.has(key) && !ANNOTATIONS.has(key) && !key.startsWith('x-')) {
      report(pattern, pattern, `unsupported schema keyword "${key}"`)
    }
  }
  for (const key of ['required', 'enum', 'allOf', 'anyOf', 'oneOf']) {
    if (node[key] !== undefined && !Array.isArray(node[key])) report(pattern, pattern, `${key} is not an array`)
  }
  for (const [key, child] of Object.entries(node.properties ?? {})) lint(child, `${pattern}.${key}`, report)
  if (Array.isArray(node.items)) report(pattern, pattern, 'items is a tuple, OpenAPI 3.0 allows a single schema')
  else if (node.items !== undefined) lint(node.items, `${pattern}[]`, report)
  if (node.additionalProperties !== undefined && typeof node.additionalProperties !== 'boolean') {
    lint(node.additionalProperties, `${pattern}.{}`, report)
  }
  for (const key of ['allOf', 'anyOf', 'oneOf']) {
    if (Array.isArray(node[key])) {
      node[key].forEach((branch: unknown, i: number) => lint(branch, `${pattern}(${key} ${i})`, report))
    }
  }
}

// `pattern` replaces array indexes with [] and additionalProperties keys with {} so mismatches group by field.
// Malformed parts are skipped here, lint() reports them.
function check(
  schema: Schema,
  value: unknown,
  at: string,
  pattern: string,
  report: Report,
  presence?: Map<string, Presence>,
) {
  if (!schema || typeof schema !== 'object') return
  const actual = typeOf(value)
  // `type` may be a list, as in OpenAPI 3.1, which the pro spec uses for nullable fields
  const types: string[] = schema.type === undefined ? [] : [schema.type].flat()
  if (value === null && (schema.nullable || types.includes('null'))) return

  const branches = (key: string): Schema[] => (Array.isArray(schema[key]) ? schema[key] : [])
  const passes = (branch: Schema) => {
    let failed = false
    check(branch, value, at, pattern, () => {
      failed = true
    })
    return !failed
  }
  for (const branch of branches('allOf')) check(branch, value, at, pattern, report, presence)
  if (schema.anyOf && !branches('anyOf').some(passes)) report(pattern, at, `matches no anyOf branch, got ${actual}`)
  if (schema.oneOf) {
    const matched = branches('oneOf').filter(passes).length
    if (matched !== 1) report(pattern, at, `matches ${matched} oneOf branches, got ${actual}`)
  }

  if (types.length > 0 && !types.some((type) => type === actual || (type === 'number' && actual === 'integer'))) {
    const allowed = schema.nullable ? [...types, 'null'] : types
    report(pattern, at, `expected ${allowed.join(' or ')}, got ${actual}`)
    return
  }
  if (Array.isArray(schema.enum) && !schema.enum.includes(value)) {
    report(pattern, at, `not in enum: ${JSON.stringify(value)}`)
  }

  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) report(pattern, at, `below minimum ${schema.minimum}`)
    if (schema.maximum !== undefined && value > schema.maximum) report(pattern, at, `above maximum ${schema.maximum}`)
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      report(pattern, at, `fewer than ${schema.minItems} items`)
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      report(pattern, at, `more than ${schema.maxItems} items`)
    }
    if (schema.items && !Array.isArray(schema.items)) {
      value.forEach((item, i) => check(schema.items, item, `${at}[${i}]`, `${pattern}[]`, report, presence))
    }
  }

  if (actual === 'object') {
    const object = value as Record<string, unknown>
    const properties: Record<string, Schema> = schema.properties ?? {}
    for (const key of Array.isArray(schema.required) ? schema.required : []) {
      if (!Object.hasOwn(object, key)) report(pattern, at, `missing required key "${key}"`)
    }
    for (const key of Object.keys(properties)) {
      const seen = presence?.get(`${pattern}.${key}`) ?? { objects: 0, present: 0 }
      seen.objects++
      if (Object.hasOwn(object, key)) seen.present++
      presence?.set(`${pattern}.${key}`, seen)
    }
    for (const [key, item] of Object.entries(object)) {
      if (Object.hasOwn(properties, key)) {
        check(properties[key], item, `${at}.${key}`, `${pattern}.${key}`, report, presence)
      } else if (schema.additionalProperties === false) report(pattern, at, `undocumented key "${key}"`)
      else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') {
        check(schema.additionalProperties, item, `${at}.${key}`, `${pattern}.{}`, report, presence)
      }
    }
  }
}

function exampleOf(param: Schema): string | undefined {
  const example = param.example ?? param.schema?.example ?? param.schema?.default
  if (example === undefined) return undefined
  return typeof example === 'object' ? JSON.stringify(example) : String(example)
}

const args = process.argv.slice(2)
const files = args.filter((arg) => arg.endsWith('.json'))
const only = new Set(args.filter((arg) => !arg.endsWith('.json')))
if (files.length === 0) files.push(join(import.meta.dirname, '..', 'defillama-openapi-free.json'))
const apiKey = process.env.DEFILLAMA_API_KEY
// Error bodies can echo the request path, which carries the key on the pro server
const redact = (text: string) => (apiKey ? text.replaceAll(apiKey, '***') : text)

let ok = 0
let skipped = 0
let failed = 0
const matched = new Set<string>()

for (const file of files) {
  const spec = JSON.parse(readFileSync(resolve(file), 'utf8'))
  console.log(`\n${file}`)

  for (const [path, pathItem] of Object.entries<Schema>(spec.paths)) {
    const operation = pathItem.get
    if (!operation || (only.size > 0 && !only.has(path))) continue
    matched.add(path)
    const label = `GET ${path}`

    const groups = new Map<string, Group>()
    const record: Report = (pattern, at, message) => {
      const key = `${pattern}  ${message}`
      const group = groups.get(key)
      if (group) group.count++
      else groups.set(key, { count: 1, first: at })
    }
    const summary = () => {
      const sorted = [...groups].sort((a, b) => b[1].count - a[1].count)
      const lines = sorted
        .slice(0, 10)
        .map(([key, group]) => `${String(group.count).padStart(6)}x  ${key}  (first at ${group.first})`)
      if (sorted.length > 10) lines.push(`and ${sorted.length - 10} more kinds of mismatch`)
      return lines
    }
    const skip = (reason: string) => {
      skipped++
      console.log(`  skip  ${label}  (${reason})`)
    }
    const fail = (lines: string[]) => {
      failed++
      console.log(`  FAIL  ${label}`)
      for (const line of lines) console.log(`          ${redact(line)}`)
    }

    if (operation.deprecated) {
      skip('deprecated')
      continue
    }
    const schema = operation.responses?.['200']?.content?.['application/json']?.schema
    if (!schema) {
      fail(['no application/json schema documented for 200'])
      continue
    }

    let url: string | undefined = (operation.servers ?? pathItem.servers ?? spec.servers)?.[0]?.url
    if (!url) {
      fail(['no server URL documented'])
      continue
    }
    if (url.includes(KEY_VARIABLE)) {
      if (!apiKey) {
        skip('needs DEFILLAMA_API_KEY')
        continue
      }
      url = url.replaceAll(KEY_VARIABLE, () => apiKey)
    }

    // Operation parameters override path-level ones with the same name and location
    const params = new Map<string, Schema>()
    for (const param of [...(pathItem.parameters ?? []), ...(operation.parameters ?? [])]) {
      params.set(`${param.in}:${param.name}`, param)
    }
    let route = path
    const query = new URLSearchParams()
    const missing: string[] = []
    for (const param of params.values()) {
      const example = exampleOf(param)
      if (param.in === 'path') {
        if (example === undefined) missing.push(param.name)
        else {
          // : and , stay readable, the coins routes take ids like ethereum:0x...,coingecko:ethereum
          const value = encodeURIComponent(example).replace(/%3A/gi, ':').replace(/%2C/gi, ',')
          route = route.replaceAll(`{${param.name}}`, () => value)
        }
      } else if (param.in === 'query' && param.required && example !== undefined) {
        query.set(param.name, example)
      }
    }
    if (missing.length > 0) {
      skip(`no example for ${missing.join(', ')}`)
      continue
    }
    url += route
    if (query.size > 0) url += `?${query}`

    lint(schema, '$', record)

    let body: unknown
    let bytes = 0
    try {
      const response = await fetch(url, {
        headers: { accept: 'application/json', 'user-agent': 'defillama-api-docs-spec-check' },
        signal: AbortSignal.timeout(120_000),
      })
      const text = await response.text()
      bytes = Buffer.byteLength(text)
      if (response.status !== 200) {
        fail([`HTTP ${response.status}: ${text.slice(0, 120)}`, ...summary()])
        continue
      }
      body = JSON.parse(text)
    } catch (error) {
      const reason = error instanceof Error ? error.message : String(error)
      const cause = error instanceof Error && error.cause instanceof Error ? `: ${error.cause.message}` : ''
      fail([`could not read the response: ${reason}${cause}`, ...summary()])
      continue
    }

    const presence = new Map<string, Presence>()
    check(schema, body, '$', '$', record, presence)
    for (const [pattern, { objects, present }] of presence) {
      if (present === 0 && objects >= MIN_OBJECTS) {
        record(pattern, pattern, `documented, absent from all ${objects} objects`)
      }
    }

    if (groups.size > 0) {
      fail(summary())
      continue
    }
    ok++
    console.log(`  ok    ${label}  ${(bytes / 1e6).toFixed(1)} MB`)
  }
}

for (const path of only) {
  if (!matched.has(path)) {
    failed++
    console.log(`\n  FAIL  no GET operation at ${path}`)
  }
}
console.log(`\n${ok} ok, ${failed} failed, ${skipped} skipped`)
if (ok + failed === 0) console.log('nothing was checked')
if (failed > 0 || ok === 0) process.exitCode = 1
