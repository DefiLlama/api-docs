<script setup lang="ts">
import { ScalarButton, ScalarIcon } from '@scalar/components'
import type { Environment } from '@scalar/oas-utils/entities/environment'
import type {
  Collection,
  Operation,
  RequestMethod,
  Server,
} from '@scalar/oas-utils/entities/spec'
import type { Workspace } from '@scalar/oas-utils/entities/workspace'
import { REQUEST_METHODS } from '@scalar/oas-utils/helpers'
import { ref, useId, watch } from 'vue'

import CodeInput from '@/components/CodeInput/CodeInput.vue'
import { ServerDropdown } from '@/components/Server'
import { useLayout } from '@/hooks'
import { useWorkspace } from '@/store'
import type { EnvVariable } from '@/store/active-entities'
import { useActiveEntities } from '@/store/active-entities'
import { createFetchQueryParams } from '@/libs/send-request/create-fetch-query-params'
import { replaceTemplateVariables } from '@/libs/string-template'
import { getApiKeyForUrl, doesUrlRequireApiKey } from '@/libs/api-key-manager'
import { mergeUrls } from '@scalar/helpers/url/merge-urls'

import HttpMethod from '../HttpMethod/HttpMethod.vue'
import AddressBarHistory from './AddressBarHistory.vue'

const { collection, operation, server, environment, envVariables, workspace } =
  defineProps<{
    collection: Collection
    operation: Operation
    server: Server | undefined
    environment: Environment
    envVariables: EnvVariable[]
    workspace: Workspace
  }>()

defineEmits<{
  (e: 'importCurl', value: string): void
}>()

const id = useId()

const { requestMutators, events } = useWorkspace()
const { activeExample } = useActiveEntities()

const { layout } = useLayout()

const addressBarRef = ref<typeof CodeInput | null>(null)
const sendButtonRef = ref<typeof ScalarButton | null>(null)

/** update the instance path parameters on change */
const onUrlChange = (newPath: string) => {
  if (operation.path === newPath) {
    return
  }
  requestMutators.edit(operation.uid, 'path', newPath)
}

/** watch for changes in the URL */
watch(
  () => operation.path,
  (newURL) => {
    if (!newURL) {
      return
    }
    onUrlChange(newURL)
  },
)

/** The amount remaining to load from 100 -> 0 */
const percentage = ref(100)
/** Keeps track of how much was left when the request finished */
const remaining = ref(0)
/** Whether or not there is a request loading */
const isRequesting = ref(false)
/** The loading interval */
const interval = ref<ReturnType<typeof setInterval>>()

function load() {
  if (isRequesting.value) {
    // Reduce asymptotically up to 85% loaded
    percentage.value -= (percentage.value - 15) / 60
  } else {
    // Always finish loading linearly over 400ms
    percentage.value -= remaining.value / 20
  }
  if (percentage.value <= 0) {
    clearInterval(interval.value)
    interval.value = undefined
    percentage.value = 100
    isRequesting.value = false
  }
}

function startLoading() {
  if (interval.value) {
    return
  }
  isRequesting.value = true
  interval.value = setInterval(load, 20)
}

function stopLoading() {
  remaining.value = percentage.value
  isRequesting.value = false
}

function abortLoading() {
  clearInterval(interval.value)
  interval.value = undefined
  percentage.value = 100
  isRequesting.value = false
}

events.requestStatus.on((status) => {
  if (status === 'start') {
    startLoading()
  }
  if (status === 'stop') {
    stopLoading()
  }
  if (status === 'abort') {
    abortLoading()
  }
})

/** Focus the address bar (or the send button if in modal layout) */
events.focusAddressBar.on(() => {
  if (layout === 'modal') {
    sendButtonRef.value?.$el?.focus()
  } else {
    addressBarRef.value?.focus()
  }
})

function updateRequestMethod(method: RequestMethod) {
  requestMutators.edit(operation.uid, 'method', method)
}

function getBackgroundColor() {
  const { method } = operation
  return REQUEST_METHODS[method].colorVar
}

function handleExecuteRequest() {
  if (isRequesting.value) {
    return
  }
  events.executeRequest.emit({ requestUid: operation.uid })
}

/** Handle hotkeys */
events.hotKeys.on((event) => {
  if (event?.focusAddressBar) {
    addressBarRef.value?.focus()
  }
  if (event?.executeRequest) {
    handleExecuteRequest()
  }
})

/**
 * TODO: Should we handle query params here somehow?
 */
function updateRequestPath(url: string) {
  requestMutators.edit(operation.uid, 'path', url)
}

/**
 * Decode specific URL-encoded characters to make URLs more readable
 * Whitelisted characters that should be decoded back to original form
 */
const decodeWhitelistedCharacters = (url: string): string => {
  return url
    .replace(/%3A/g, ':')  // Decode colons
    .replace(/%2C/g, ',')  // Decode commas
}

/** Get the complete URL including server, query params, and API key injection */
function getCompleteUrl(): string {
  try {
    const env = environment || {}
    
    // Get the current active example with user-entered parameter values
    if (!activeExample.value) {
      // Fallback to basic URL construction if no active example
      const serverString = replaceTemplateVariables(server?.url ?? '', env)
      const pathString = replaceTemplateVariables(operation.path, env)
      const url = serverString || pathString
      
      if (!url) return ''
      
      // Get API key injection
      const resolvedWorkspaceId = workspace.uid || 'default'
      const apiKey = getApiKeyForUrl(resolvedWorkspaceId, serverString)
      const shouldInjectApiKey = doesUrlRequireApiKey(serverString)
      
      return decodeWhitelistedCharacters((mergeUrls as any)(url, pathString, new URLSearchParams(), false, apiKey || undefined, shouldInjectApiKey))
    }

    /** Parsed and evaluated values for path parameters */
    const pathVariables = activeExample.value.parameters.path.reduce<Record<string, string>>((vars, param) => {
      if (param.enabled) {
        vars[param.key] = replaceTemplateVariables(param.value, env)
      }
      return vars
    }, {})

    const serverString = replaceTemplateVariables(server?.url ?? '', env)
    // Replace environment variables, then path variables
    const pathString = replaceTemplateVariables(replaceTemplateVariables(operation.path, env), pathVariables)

    /**
     * Start building the main URL, we cannot use the URL class yet as it does not work with relative servers
     * Also handles the case of no server with pathString
     */
    let url = serverString || pathString

    // Handle empty url
    if (!url) {
      return ''
    }

    // Set the server variables (for now we only support default values)
    Object.entries(server?.variables ?? {}).forEach(([k, v]) => {
      url = replaceTemplateVariables(url, {
        [k]: pathVariables[k] || v.default,
      })
    })

    // Create query parameters from the current example
    const urlParams = createFetchQueryParams(activeExample.value, env, operation)

    // Get API key for this workspace if it's needed for the server URL
    const resolvedWorkspaceId = workspace.uid || 'default'
    const apiKey = getApiKeyForUrl(resolvedWorkspaceId, serverString)
    const shouldInjectApiKey = doesUrlRequireApiKey(serverString)

    // Combine the url with the path and server + query params + API key injection
    const finalUrl = (mergeUrls as any)(url, pathString, urlParams, false, apiKey || undefined, shouldInjectApiKey)

    return decodeWhitelistedCharacters(finalUrl)
  } catch (error) {
    console.error('Error building complete URL:', error)
    // Fallback to basic URL construction
    return decodeWhitelistedCharacters(`${server?.url || ''}${operation.path || ''}`)
  }
}

/** Copy the complete URL to clipboard */
async function copyUrlToClipboard() {
  try {
    const url = getCompleteUrl()
    await navigator.clipboard.writeText(url)
    // TODO: Add toast notification for success
  } catch (error) {
    console.error('Failed to copy URL to clipboard:', error)
    // Fallback for older browsers
    const textArea = document.createElement('textarea')
    textArea.value = getCompleteUrl()
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
  }
}
</script>
<template>
  <div
    :id="id"
    class="scalar-address-bar order-last flex h-(--scalar-address-bar-height) w-full [--scalar-address-bar-height:32px] lg:order-none lg:w-auto">
    <!-- Address Bar -->
    <div
      class="address-bar-bg-states text-xxs group relative order-last flex w-full max-w-[calc(100dvw-24px)] flex-1 flex-row items-stretch rounded-lg p-0.75 lg:order-none lg:max-w-[580px] lg:min-w-[580px] xl:max-w-[720px] xl:min-w-[720px]">
      <div
        class="pointer-events-none absolute top-0 left-0 block h-full w-full overflow-hidden rounded-lg border">
        <div
          class="absolute top-0 left-0 z-[1002] h-full w-full"
          :style="{
            backgroundColor: `color-mix(in srgb, transparent 90%, ${getBackgroundColor()})`,
            transform: `translate3d(-${percentage}%,0,0)`,
          }" />
      </div>
      <div class="z-context-plus flex gap-1">
        <HttpMethod
          :isEditable="layout !== 'modal'"
          isSquare
          :method="operation.method"
          teleport
          @change="updateRequestMethod" />
      </div>

      <div
        class="scroll-timeline-x scroll-timeline-x-hidden z-context-plus relative flex w-full bg-blend-normal">
        <!-- Servers -->
        <ServerDropdown
          v-if="collection.servers.length"
          :collection="collection"
          layout="client"
          :operation="operation"
          :server="server"
          :target="id" />

        <div class="fade-left" />
        <!-- Path + URL + env vars -->
        <CodeInput
          ref="addressBarRef"
          aria-label="Path"
          class="min-w-fit outline-none"
          disableCloseBrackets
          :disabled="layout === 'modal'"
          disableEnter
          disableTabIndent
          :emitOnBlur="false"
          :envVariables="envVariables"
          :environment="environment"
          importCurl
          :modelValue="operation.path"
          :placeholder="
            server?.uid && collection.servers.includes(server.uid)
              ? ''
              : 'Enter a URL or cURL command'
          "
          server
          :workspace="workspace"
          @curl="$emit('importCurl', $event)"
          @submit="handleExecuteRequest"
          @update:modelValue="updateRequestPath" />
        <div class="fade-right" />
      </div>

      <AddressBarHistory
        :operation="operation"
        :target="id" />
      
      <!-- Copy URL Button -->
      <ScalarButton
        class="z-context-plus relative h-auto shrink-0 overflow-hidden p-2"
        title="Copy complete URL to clipboard"
        variant="ghost"
        @click="copyUrlToClipboard">
        <ScalarIcon
          class="relative shrink-0 fill-current"
          icon="Clipboard"
          size="xs" />
        <span class="sr-only">Copy complete URL to clipboard</span>
      </ScalarButton>
      
      <ScalarButton
        ref="sendButtonRef"
        class="z-context-plus relative h-auto shrink-0 overflow-hidden py-1 pr-2.5 pl-2 font-bold"
        :disabled="isRequesting"
        @click="handleExecuteRequest">
        <span
          aria-hidden="true"
          class="inline-flex items-center gap-1">
          <ScalarIcon
            class="relative shrink-0 fill-current"
            icon="Play"
            size="xs" />
          <span class="text-xxs hidden lg:flex">Send</span>
        </span>
        <span class="sr-only">
          Send {{ operation.method }} request to {{ server?.url ?? ''
          }}{{ operation.path }}
        </span>
      </ScalarButton>
    </div>
  </div>
</template>
<style scoped>
:deep(.cm-editor) {
  height: 100%;
  outline: none;
  width: 100%;
}
:deep(.cm-line) {
  padding: 0;
}
:deep(.cm-content) {
  padding: 0;
  display: flex;
  align-items: center;
  font-size: var(--scalar-small);
}
.scroll-timeline-x {
  scroll-timeline: --scroll-timeline x;
  /* Firefox supports */
  scroll-timeline: --scroll-timeline horizontal;
  -ms-overflow-style: none; /* IE and Edge */
}
.scroll-timeline-x-hidden {
  overflow-x: auto;
}
.scroll-timeline-x-hidden :deep(.cm-scroller) {
  scrollbar-width: none;
  -ms-overflow-style: none;
  padding-right: 20px;
  overflow: auto;
}
.scroll-timeline-x-hidden::-webkit-scrollbar {
  width: 0;
  height: 0;
  display: none;
}
.scroll-timeline-x-hidden :deep(.cm-scroller::-webkit-scrollbar) {
  width: 0;
  height: 0;
  display: none;
}
.scroll-timeline-x-address {
  line-height: 27px;
  scrollbar-width: none; /* Firefox */
}
/* make clickable are to left of send button */
.scroll-timeline-x-address:after {
  content: '';
  position: absolute;
  height: 100%;
  width: 24px;
  right: 0;
  cursor: text;
}
.scroll-timeline-x-address:empty:before {
  content: 'Enter URL or cURL request';
  color: var(--scalar-color-3);
  pointer-events: none;
}
.fade-left,
.fade-right {
  content: '';
  position: sticky;
  height: 100%;
  animation-name: fadein;
  animation-duration: 1ms;
  animation-direction: reverse;
  animation-timeline: --scroll-timeline;
  pointer-events: none;
  z-index: 1;
}
.fade-left {
  background: linear-gradient(
    -90deg,
    color-mix(in srgb, var(--scalar-address-bar-bg), transparent 100%) 0%,
    color-mix(in srgb, var(--scalar-address-bar-bg), transparent 20%) 30%,
    var(--scalar-address-bar-bg) 100%
  );
  left: -1px;
  min-width: 6px;
  animation-direction: normal;
}
.fade-right {
  background: linear-gradient(
    90deg,
    color-mix(in srgb, var(--scalar-address-bar-bg), transparent 100%) 0%,
    color-mix(in srgb, var(--scalar-address-bar-bg), transparent 20%) 30%,
    var(--scalar-address-bar-bg) 100%
  );
  right: -1px;
  min-width: 24px;
}
@keyframes fadein {
  0% {
    opacity: 0;
  }
  1% {
    opacity: 1;
  }
}
.address-bar-bg-states {
  --scalar-address-bar-bg: color-mix(
    in srgb,
    var(--scalar-background-1),
    var(--scalar-background-2)
  );
  background: var(--scalar-address-bar-bg);
}
.address-bar-bg-states:has(.cm-focused) {
  --scalar-address-bar-bg: var(--scalar-background-1);
  border-color: var(--scalar-border-color);
  outline: 1px solid var(--scalar-color-accent);
}
.address-bar-bg-states:has(.cm-focused) .fade-left,
.address-bar-bg-states:has(.cm-focused) .fade-right {
  --scalar-address-bar-bg: var(--scalar-background-1);
}
</style>
