/**
 * Builds the OpenAPI document the docs page renders, from the two published specs.
 *
 * Before the Scalar upgrade, these behaviours lived in patches inside the Scalar packages
 * (API key injection, PRO and Beta badges). Doing them here, on an in-memory copy, means the
 * Scalar packages stay identical to upstream and the spec files on disk are never touched.
 */

type Json = Record<string, any>

export const PRO_HOST = 'https://pro-api.llama.fi'

/** Shown in snippets when no key is saved, so copied URLs make the key's position obvious. */
export const API_KEY_PLACEHOLDER = '<API-KEY>'

export const INTRODUCTION_HEADING = 'Introduction'

/** The name of the /usage/{YOUR_API_KEY} path parameter. */
const KEY_VARIABLE = 'YOUR_API_KEY'

export const API_PLAN_BADGE = { name: 'API Plan', position: 'before', color: 'var(--scalar-color-orange)' }
export const BETA_BADGE = { name: 'Beta', position: 'before', color: '#9333ea' }

const HTTP_METHODS = new Set(['get', 'put', 'post', 'delete', 'options', 'head', 'patch', 'trace'])

const forEachOperation = (spec: Json, callback: (operation: Json) => void): void => {
  for (const pathItem of Object.values<Json>(spec.paths ?? {})) {
    for (const [method, operation] of Object.entries<Json>(pathItem)) {
      if (HTTP_METHODS.has(method)) {
        callback(operation)
      }
    }
  }
}

/**
 * The server each pro operation uses, with the key already in it: https://pro-api.llama.fi/{key}.
 * It sits on the operations, not the document. The page's Server box then shows the bare host,
 * as before the upgrade, while snippets, Test Request and Copy URL still carry the key. A plain URL
 * (not the spec's {YOUR_API_KEY} variable) also keeps Scalar from adding an editable key field.
 */
const keyedServer = (key: string): Json => ({ url: `${PRO_HOST}/${key}` })

/**
 * Prepares one operation for display:
 * - pro operations get the pro server with the key (or placeholder) in the path
 * - /usage/{YOUR_API_KEY} takes the key as its last path segment, so it gets it as the example
 * - x-api-plan-only and x-api-beta become Scalar's native x-badges
 */
const prepareOperation = (operation: Json, server: Json | undefined, key: string): void => {
  // Only /usage has its own server. It keeps the bare host because the key is in its path.
  if (server && !operation.servers) {
    operation.servers = [server]
  }

  /**
   * Scalar's Test Request looks up the document's selected server inside the operation's own
   * servers, finds nothing, and sends to the page origin. Pre-selecting the operation's server
   * avoids that, for our pro operations and the free ones on coins/yields/stablecoins hosts.
   */
  if (operation.servers?.[0] && !operation['x-scalar-selected-server']) {
    operation['x-scalar-selected-server'] = operation.servers[0].url
  }

  for (const parameter of operation.parameters ?? []) {
    if (parameter.in === 'path' && parameter.name === KEY_VARIABLE) {
      parameter.example = key
    }
  }

  const badges = [
    ...(operation['x-api-plan-only'] === true ? [API_PLAN_BADGE] : []),
    ...(operation['x-api-beta'] === true ? [BETA_BADGE] : []),
  ]
  if (badges.length) {
    operation['x-badges'] = [...(operation['x-badges'] ?? []), ...badges]
  }
}

/**
 * Returns the document to render.
 * - With a key: the pro spec, every request going to pro-api.llama.fi/{key}.
 * - Without a key: the free spec, plus the API-plan-only operations from the pro spec,
 *   which keep the pro host and show <API-KEY> where the key goes.
 */
export const buildSpec = (freeSpecContent: Json, proSpecContent: Json, apiKey: string | null): Json => {
  const proSpec = structuredClone(proSpecContent)
  const key = apiKey ? encodeURIComponent(apiKey) : API_KEY_PLACEHOLDER
  const server = keyedServer(key)

  if (apiKey) {
    proSpec.servers = [{ url: PRO_HOST }]
    forEachOperation(proSpec, (operation) => prepareOperation(operation, server, key))
    return proSpec
  }

  const freeSpec = structuredClone(freeSpecContent)

  /**
   * When the description opens with text, Scalar adds an "Introduction" sidebar entry and nests
   * Using AI?, Authentication and SDK under it. An explicit heading keeps all four side by side, as
   * on the site before the upgrade. style.css hides the heading itself in the page.
   */
  const description = freeSpec.info?.description?.trim()
  if (description && !description.startsWith('#')) {
    freeSpec.info.description = `## ${INTRODUCTION_HEADING}\n\n${description}`
  }

  forEachOperation(freeSpec, (operation) => prepareOperation(operation, undefined, key))

  for (const [path, pathItem] of Object.entries<Json>(proSpec.paths)) {
    for (const [method, operation] of Object.entries<Json>(pathItem)) {
      if (!HTTP_METHODS.has(method) || operation['x-api-plan-only'] !== true) {
        continue
      }
      prepareOperation(operation, server, key)
      freeSpec.paths[path] ??= {}
      freeSpec.paths[path][method] = operation
    }
  }

  return freeSpec
}

/**
 * True when a request URL still carries the placeholder, so the visitor has no key saved.
 * Scalar may percent-encode it, so both forms count.
 */
export const isMissingApiKey = (url: string): boolean =>
  url.includes(API_KEY_PLACEHOLDER) || url.includes(encodeURIComponent(API_KEY_PLACEHOLDER))
