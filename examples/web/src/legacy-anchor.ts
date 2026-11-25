/**
 * Before the Scalar upgrade, operation links used a lowercase method (#tag/tvl/get/protocols).
 * Scalar now writes it in capitals (#tag/tvl/GET/protocols) and ignores the old form, so links
 * people already shared would land at the top of the page. This rewrites them before Scalar reads the hash.
 */
const LEGACY_OPERATION_ANCHOR = /^#tag\/([^/]+)\/(get|put|post|delete|options|head|patch|trace)\//

export const toCurrentAnchor = (hash: string): string =>
  hash.replace(LEGACY_OPERATION_ANCHOR, (_match, tag: string, method: string) => `#tag/${tag}/${method.toUpperCase()}/`)

export const upgradeLegacyAnchor = (): void => {
  const current = toCurrentAnchor(window.location.hash)
  if (current !== window.location.hash) {
    history.replaceState(history.state, '', current)
  }
}
