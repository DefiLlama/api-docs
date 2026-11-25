import { describe, expect, it } from 'vitest'

import freeSpec from '../../../defillama-openapi-free.json'
import proSpec from '../../../defillama-openapi-pro.json'
import { API_KEY_PLACEHOLDER, API_PLAN_BADGE, BETA_BADGE, buildSpec, isMissingApiKey } from './spec-transform'

const operations = (spec: Record<string, any>) =>
  Object.entries<Record<string, any>>(spec.paths).flatMap(([path, item]) =>
    Object.entries<Record<string, any>>(item).map(([method, operation]) => ({ path, method, operation })),
  )

describe('spec-transform', () => {
  describe('buildSpec with a key', () => {
    const spec = buildSpec(freeSpec, proSpec, 'my-key')

    // The Server box shows the bare host, as before the upgrade, with no editable key field
    it('shows the bare pro host as the document server', () => {
      expect(spec.servers).toEqual([{ url: 'https://pro-api.llama.fi' }])
    })

    it('puts the key in the path of every other operation', () => {
      for (const { path, operation } of operations(spec)) {
        if (path === '/usage/{YOUR_API_KEY}') {
          continue
        }
        expect(operation.servers).toEqual([{ url: 'https://pro-api.llama.fi/my-key' }])
      }
    })

    it('percent-encodes a key with URL-unsafe characters', () => {
      const encoded = buildSpec(freeSpec, proSpec, 'a/b c')
      expect(encoded.paths['/api/protocols'].get.servers[0].url).toBe('https://pro-api.llama.fi/a%2Fb%20c')
    })

    it('puts the key at the end of the usage path, on the bare host', () => {
      const usage = spec.paths['/usage/{YOUR_API_KEY}'].get
      expect(usage.servers).toEqual([{ url: 'https://pro-api.llama.fi' }])
      expect(usage.parameters[0].example).toBe('my-key')
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
      expect(proSpec.servers[0]?.variables.YOUR_API_KEY.default).toBe('YOUR_API_KEY')
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

    it('adds every API-plan-only operation from the pro spec, with the placeholder in the path', () => {
      const planOnly = operations(proSpec).filter(({ operation }) => operation['x-api-plan-only'] === true)
      for (const { path, method } of planOnly) {
        const operation = spec.paths[path][method]
        expect(operation['x-badges']).toContainEqual(API_PLAN_BADGE)
        if (path !== '/usage/{YOUR_API_KEY}') {
          expect(operation.servers).toEqual([{ url: `https://pro-api.llama.fi/${API_KEY_PLACEHOLDER}` }])
        }
      }
    })

    it('leaves free operations on their own hosts', () => {
      const free = operations(freeSpec)
      for (const { path, method, operation } of free) {
        expect(spec.paths[path][method].servers).toEqual(operation.servers)
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
    it('detects the placeholder, raw or percent-encoded', () => {
      expect(isMissingApiKey('https://pro-api.llama.fi/<API-KEY>/api/protocols')).toBe(true)
      expect(isMissingApiKey('https://pro-api.llama.fi/%3CAPI-KEY%3E/api/protocols')).toBe(true)
    })

    it('ignores real keys and free hosts', () => {
      expect(isMissingApiKey('https://pro-api.llama.fi/abc123/api/protocols')).toBe(false)
      expect(isMissingApiKey('https://api.llama.fi/protocols')).toBe(false)
    })
  })
})
