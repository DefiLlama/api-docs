<script setup lang="ts">
import { ApiReference, type ApiReferenceConfiguration } from '@scalar/api-reference'
import { computed, ref } from 'vue'

// Import the new spec files
import freeSpecContent from '../../../../defillama-openapi-free.json'
import proSpecContent from '../../../../defillama-openapi-pro.json'
import ApiKeyInput from '../components/ApiKeyInput.vue'
import SlotPlaceholder from '../components/SlotPlaceholder.vue'
import { buildSpec, isMissingApiKey } from '../spec-transform'

/** The saved key, or null on the free plan. ApiKeyInput reports it on mount and on every change. */
const apiKey = ref<string | null>(null)

/**
 * Test Request on an API-plan endpoint without a key would send <API-KEY> to the API.
 * We answer it here instead, so the visitor sees what to do rather than an auth error.
 */
const customFetch: typeof fetch = (input, init) => {
  const url = input instanceof Request ? input.url : String(input)
  if (isMissingApiKey(url)) {
    return Promise.resolve(
      new Response(
        JSON.stringify({ error: 'Please set an API key to use this pro endpoint.' }),
        { status: 401, statusText: 'API key required', headers: { 'Content-Type': 'application/json' } },
      ),
    )
  }
  return fetch(input, init)
}

const configuration = computed<Partial<ApiReferenceConfiguration>>(() => ({
  /**
   * Without this, Scalar opens on the first custom code sample (the JavaScript SDK). curl shows the
   * full URL, so readers and agents see exactly which host and key placement to use.
   */
  defaultHttpClient: { targetKey: 'shell', clientKey: 'curl' },
  /** Shows the Beta badge in the sidebar. style.css hides the other badges there. */
  showBadgesInSidebar: true,
  customFetch,
  /**
   * Scalar's own toolbar, hosting invite and AI chat. Off by default outside localhost, but turned
   * off here too so local testing looks like production and an upstream default change cannot show them.
   */
  showDeveloperTools: 'never',
  agent: { disabled: true },
  // Add path routing option
  ...(window.location.pathname.startsWith('/path-routing')
    ? {
        pathRouting: { basePath: '/path-routing' },
      }
    : {}),
  content: buildSpec(freeSpecContent, proSpecContent, apiKey.value),
}))

const handleApiKeyChange = (key: string | null) => {
  apiKey.value = key
}
</script>

<template>
  <div class="standalone-api-reference-page">
    <ApiKeyInput @api-key-change="handleApiKeyChange" />
    <!-- Remount when the key changes, so every snippet and request picks up the new server URL -->
    <ApiReference
      :key="apiKey ?? 'free'"
      :configuration="configuration">
      <template #footer><SlotPlaceholder>footer</SlotPlaceholder></template>
    </ApiReference>
  </div>
</template>

<style scoped>
.standalone-api-reference-page {
  padding: 1rem;
}
</style>
