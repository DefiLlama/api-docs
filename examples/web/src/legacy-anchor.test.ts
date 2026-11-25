import { describe, expect, it } from 'vitest'

import { toCurrentAnchor } from './legacy-anchor'

describe('legacy-anchor', () => {
  describe('toCurrentAnchor', () => {
    it('capitalizes the method of a pre-upgrade operation link', () => {
      expect(toCurrentAnchor('#tag/tvl/get/protocols')).toBe('#tag/tvl/GET/protocols')
      expect(toCurrentAnchor('#tag/coins/get/prices/current/{coins}')).toBe('#tag/coins/GET/prices/current/{coins}')
      expect(toCurrentAnchor('#tag/fees-and-revenue/post/x')).toBe('#tag/fees-and-revenue/POST/x')
    })

    it('leaves current links, tag links and description links alone', () => {
      for (const hash of ['#tag/tvl/GET/protocols', '#tag/tvl', '#description/introduction', '', '#tag/getters']) {
        expect(toCurrentAnchor(hash)).toBe(hash)
      }
    })

    // A tag literally named like a method must not be mistaken for one
    it('only rewrites the method segment, not a tag named get', () => {
      expect(toCurrentAnchor('#tag/get/get/x')).toBe('#tag/get/GET/x')
    })
  })
})
