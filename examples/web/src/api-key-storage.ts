/**
 * Saved API key, in the same localStorage slot and shape the old patched @scalar/api-client used.
 * Keeping both means keys people saved before the Scalar upgrade still load.
 */
const STORAGE_KEY = 'scalar-api-key-default'

export type ApiKeyConfig = {
  key: string
  enabled: boolean
  description?: string
}

/** Returns the saved key, or null when there is none or storage is blocked. */
export const getApiKey = (): ApiKeyConfig | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? (JSON.parse(stored) as ApiKeyConfig) : null
  } catch {
    return null
  }
}

export const saveApiKey = (config: ApiKeyConfig): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  } catch {
    // Private windows can block storage. The key still works for this page view.
  }
}
