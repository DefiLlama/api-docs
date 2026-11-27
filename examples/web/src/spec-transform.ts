/**
 * Builds the OpenAPI document the docs page renders, from the two published specs.
 *
 * Before the Scalar upgrade, these behaviours lived in patches inside the Scalar packages
 * (API key injection, PRO and Beta badges). Doing them here, on an in-memory copy, means the
 * Scalar packages stay identical to upstream and the spec files on disk are never touched.
 */

type Json = Record<string, any>

export const PRO_HOST = 'https://pro-api.llama.fi'

/** Shown in snippets when no key is saved, so copied requests make the key's place obvious. */
export const API_KEY_PLACEHOLDER = '<API-KEY>'

export const API_KEY_HEADER = 'x-api-key'

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
 * The pro spec declares the key as an x-api-key security scheme. Scalar renders a scheme as its own
 * key form next to ApiKeyInput, so the page drops the scheme and gives every operation that needs
 * the key an x-api-key header parameter instead, with the saved key (or placeholder) as its example.
 * Snippets and Test Request then send it.
 */
const keyHeaderParameter = (key: string): Json => ({
  name: API_KEY_HEADER,
  in: 'header',
  required: true,
  description: 'Your DefiLlama API plan key',
  schema: { type: 'string' },
  example: key,
})

/**
 * Prepares one operation for display:
 * - operations that need the key get it in the x-api-key header
 * - /usage/{YOUR_API_KEY} takes the key as its last path segment, so it gets it as the example
 * - x-api-plan-only and x-api-beta become Scalar's native x-badges
 */
const prepareOperation = (operation: Json, server: Json | undefined, key: string, needsKey: boolean): void => {
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
  if (needsKey) {
    operation.parameters = [...(operation.parameters ?? []), keyHeaderParameter(key)]
  }
  delete operation.security

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
 * - With a key: the pro spec, every request going to pro-api.llama.fi with the key in x-api-key.
 * - Without a key: the free spec, plus the API-plan-only operations from the pro spec,
 *   which keep the pro host and show <API-KEY> as the x-api-key header.
 */
export const buildSpec = (freeSpecContent: Json, proSpecContent: Json, apiKey: string | null): Json => {
  const proSpec = structuredClone(proSpecContent)
  const key = apiKey ?? API_KEY_PLACEHOLDER
  const documentSecurity = proSpec.security ?? []
  const needsKey = (operation: Json): boolean => (operation.security ?? documentSecurity).length > 0
  delete proSpec.security
  delete proSpec.components?.securitySchemes

  if (apiKey) {
    forEachOperation(proSpec, (operation) => prepareOperation(operation, undefined, key, needsKey(operation)))
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

  forEachOperation(freeSpec, (operation) => prepareOperation(operation, undefined, key, false))

  for (const [path, pathItem] of Object.entries<Json>(proSpec.paths)) {
    for (const [method, operation] of Object.entries<Json>(pathItem)) {
      if (!HTTP_METHODS.has(method) || operation['x-api-plan-only'] !== true) {
        continue
      }
      prepareOperation(operation, { url: PRO_HOST }, key, needsKey(operation))
      freeSpec.paths[path] ??= {}
      freeSpec.paths[path][method] = operation
    }
  }

  return freeSpec
}

/**
 * True when a request still carries the placeholder, so the visitor has no key saved: in the
 * x-api-key header, or in the /usage path. Scalar may percent-encode the path, so both forms count.
 */
export const isMissingApiKey = (url: string, apiKeyHeader: string | null): boolean =>
  apiKeyHeader === API_KEY_PLACEHOLDER ||
  url.includes(API_KEY_PLACEHOLDER) ||
  url.includes(encodeURIComponent(API_KEY_PLACEHOLDER))
