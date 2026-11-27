import { describe, expect, it } from 'vitest'

import freeSpec from '../../../defillama-openapi-free.json'
import proSpec from '../../../defillama-openapi-pro.json'
import { API_KEY_PLACEHOLDER, API_PLAN_BADGE, BETA_BADGE, buildSpec, isMissingApiKey } from './spec-transform'

const keyHeader = (operation: Record<string, any>) =>
  operation.parameters?.find(
    (parameter: Record<string, any>) => parameter.in === 'header' && parameter.name === 'x-api-key',
  )

const operations = (spec: Record<string, any>) =>
  Object.entries<Record<string, any>>(spec.paths).flatMap(([path, item]) =>
    Object.entries<Record<string, any>>(item).map(([method, operation]) => ({ path, method, operation })),
  )

describe('spec-transform', () => {
  describe('buildSpec with a key', () => {
    const spec = buildSpec(freeSpec, proSpec, 'my-key')

    it('shows the bare pro host as the document server', () => {
      expect(spec.servers.map((server: Record<string, any>) => server.url)).toEqual(['https://pro-api.llama.fi'])
    })

    it('sends the key in the x-api-key header of every other operation', () => {
      for (const { path, operation } of operations(spec)) {
        if (path === '/usage/{YOUR_API_KEY}') {
          continue
        }
        expect(keyHeader(operation)).toMatchObject({ required: true, example: 'my-key' })
        expect(operation.servers).toBeUndefined()
      }
    })

    // Scalar would render the security scheme as a second key form next to ApiKeyInput
    it('drops the security scheme', () => {
      expect(spec.security).toBeUndefined()
      expect(spec.components?.securitySchemes).toBeUndefined()
      for (const { operation } of operations(spec)) {
        expect(operation.security).toBeUndefined()
      }
    })

    it('puts the key at the end of the usage path, on the bare host, with no header', () => {
      const usage = spec.paths['/usage/{YOUR_API_KEY}'].get
      expect(usage.servers).toEqual([{ url: 'https://pro-api.llama.fi' }])
      expect(usage.parameters[0].example).toBe('my-key')
      expect(keyHeader(usage)).toBeUndefined()
    })

    it('turns x-api-plan-only and x-api-beta into x-badges', () => {
      const all = operations(spec)
      const beta = all.filter(({ operation }) => operation['x-api-beta'] === true)
      expect(beta.length).toBeGreaterThan(0)
      for (const { operation } of beta) {
        expect(operation['x-badges']).toContainEqual(BETA_BADGE)
      }
      for (const { operation } of all.filter(({ operation }) => operation['x-api-plan-only'] === true)) {
        expect(operation['x-badges']).toContainEqual(API_PLAN_BADGE)
      }
    })

    it('does not mutate the imported specs', () => {
      expect(proSpec.security).toEqual([{ apiKey: [] }])
      expect(proSpec.components.securitySchemes.apiKey.name).toBe('x-api-key')
      expect(JSON.stringify(proSpec)).not.toContain('x-badges')
    })
  })

  describe('buildSpec without a key', () => {
    const spec = buildSpec(freeSpec, proSpec, null)

    // Keeps Introduction, Using AI?, Authentication and SDK side by side in the sidebar
    it('opens the free description with an Introduction heading', () => {
      expect(spec.info.description.startsWith('## Introduction\n\n')).toBe(true)
      expect(spec.info.description).toContain(freeSpec.info.description.trim())
    })

    it('keeps the free servers', () => {
      expect(spec.servers).toEqual(freeSpec.servers)
    })

    it('adds every API-plan-only operation from the pro spec, with the placeholder in the x-api-key header', () => {
      const planOnly = operations(proSpec).filter(({ operation }) => operation['x-api-plan-only'] === true)
      for (const { path, method } of planOnly) {
        const operation = spec.paths[path][method]
        expect(operation['x-badges']).toContainEqual(API_PLAN_BADGE)
        expect(operation.servers).toEqual([{ url: 'https://pro-api.llama.fi' }])
        if (path !== '/usage/{YOUR_API_KEY}') {
          expect(keyHeader(operation)?.example).toBe(API_KEY_PLACEHOLDER)
        }
      }
    })

    it('leaves free operations on their own hosts, with no key header', () => {
      const free = operations(freeSpec)
      for (const { path, method, operation } of free) {
        expect(spec.paths[path][method].servers).toEqual(operation.servers)
        expect(keyHeader(spec.paths[path][method])).toBeUndefined()
      }
    })

    // Without this, Test Request on these operations is sent to the docs page origin
    it('pre-selects the own server of every operation that has one', () => {
      const withServers = operations(spec).filter(({ operation }) => operation.servers)
      expect(withServers.length).toBeGreaterThan(0)
      for (const { operation } of withServers) {
        expect(operation['x-scalar-selected-server']).toBe(operation.servers[0].url)
      }
    })
  })

  describe('isMissingApiKey', () => {
    it('detects the placeholder in the header, or raw or percent-encoded in the usage path', () => {
      expect(isMissingApiKey('https://pro-api.llama.fi/api/protocols', '<API-KEY>')).toBe(true)
      expect(isMissingApiKey('https://pro-api.llama.fi/usage/<API-KEY>', null)).toBe(true)
      expect(isMissingApiKey('https://pro-api.llama.fi/usage/%3CAPI-KEY%3E', null)).toBe(true)
    })

    it('ignores real keys and free hosts', () => {
      expect(isMissingApiKey('https://pro-api.llama.fi/api/protocols', 'abc123')).toBe(false)
      expect(isMissingApiKey('https://api.llama.fi/protocols', null)).toBe(false)
    })
  })
})
