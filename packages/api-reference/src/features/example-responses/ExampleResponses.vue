<script lang="ts" setup>
import {
  ScalarCard,
  ScalarCardFooter,
  ScalarCardSection,
  ScalarCodeBlock,
  ScalarIcon,
  ScalarMarkdown,
} from '@scalar/components'
import type { Operation } from '@scalar/oas-utils/entities/spec'
import {
  getObjectKeys,
  normalizeMimeTypeObject,
} from '@scalar/oas-utils/helpers'
import { useClipboard } from '@scalar/use-hooks/useClipboard'
import { computed, ref, useId } from 'vue'

import ScreenReader from '@/components/ScreenReader.vue'
import { ExamplePicker } from '@/v2/blocks/scalar-request-example-block'

import ExampleResponse from './ExampleResponse.vue'
import ExampleResponseTab from './ExampleResponseTab.vue'
import ExampleResponseTabList from './ExampleResponseTabList.vue'

/**
 * TODO: copyToClipboard isn't using the right content if there are multiple examples
 */

const { responses } = defineProps<{ responses: Operation['responses'] }>()

const id = useId()

const { copyToClipboard } = useClipboard()

// Bring the status codes in the right order.
const orderedStatusCodes = computed(() => Object.keys(responses ?? {}).sort())

const hasMultipleExamples = computed<boolean>(
  () => !!currentJsonResponse.value.examples,
)

// Keep track of the current selected tab
const selectedResponseIndex = ref<number>(0)

// Return the whole response object
const currentResponse = computed(() => {
  const currentStatusCode =
    orderedStatusCodes.value[selectedResponseIndex.value]

  return responses?.[currentStatusCode]
})

const currentJsonResponse = computed(() => {
  const normalizedContent = normalizeMimeTypeObject(
    currentResponse.value?.content,
  )

  /** All the keys of the normalized content */
  const keys = getObjectKeys(normalizedContent ?? {})

  return (
    // OpenAPI 3.x
    normalizedContent?.['application/json'] ??
    normalizedContent?.['application/xml'] ??
    normalizedContent?.['text/plain'] ??
    normalizedContent?.['text/html'] ??
    normalizedContent?.['*/*'] ??
    // Take the first key - in the future we may want to use the selected content type
    normalizedContent?.[keys[0]] ??
    // Swagger 2.0
    currentResponse.value
  )
})

const selectedExampleKey = ref<string>(
  Object.keys(currentJsonResponse.value.examples ?? {})[0] ?? '',
)

/**
 * Gets the first example response if there are multiple example responses
 * or the only example if there is only one example response.
 */
const getFirstExampleResponse = () => {
  if (!hasMultipleExamples.value) {
    return currentJsonResponse.value.example
  }
  if (Array.isArray(currentJsonResponse.value.examples)) {
    return currentJsonResponse.value.examples[0]
  }

  const firstProperty = Object.keys(currentJsonResponse.value.examples)[0]
  const firstExample = currentJsonResponse.value.examples[firstProperty]

  // Handle the case where the example already has a 'value' property
  return firstExample?.value ?? firstExample
}

const currentResponseWithExample = computed(() => ({
  ...currentJsonResponse.value,
  example:
    hasMultipleExamples.value && selectedExampleKey.value
      ? (currentJsonResponse.value.examples[selectedExampleKey.value].value ??
        currentJsonResponse.value.examples[selectedExampleKey.value])
      : getFirstExampleResponse(),
}))

const changeTab = (index: number) => {
  selectedResponseIndex.value = index
  selectedExampleKey.value = ''
}

const showSchema = ref(false)
</script>
<template>
  <ScalarCard
    v-if="orderedStatusCodes.length"
    aria-label="Example Responses"
    role="region"
    class="response-card">
    <ExampleResponseTabList @change="changeTab">
      <ExampleResponseTab
        v-for="statusCode in orderedStatusCodes"
        :key="statusCode"
        :aria-controls="id">
        <ScreenReader>Status:</ScreenReader>
        {{ statusCode }}
      </ExampleResponseTab>

      <template #actions>
        <button
          v-if="currentJsonResponse?.example"
          class="code-copy"
          type="button"
          @click="() => copyToClipboard(currentJsonResponse?.example)">
          <ScalarIcon
            icon="Clipboard"
            width="12px" />
        </button>
        <label
          v-if="currentJsonResponse?.schema"
          class="scalar-card-checkbox">
          Show Schema
          <input
            v-model="showSchema"
            :aria-controls="id"
            class="scalar-card-checkbox-input"
            type="checkbox" />
          <span class="scalar-card-checkbox-checkmark" />
        </label>
      </template>
    </ExampleResponseTabList>
    <ScalarCardSection class="grid flex-1">
      <template v-if="currentJsonResponse?.schema">
        <ScalarCodeBlock
          v-if="showSchema && currentResponseWithExample"
          :id="id"
          class="-outline-offset-2"
          :content="currentResponseWithExample"
          lang="json" />
        <ExampleResponse
          v-else
          :id="id"
          :response="currentResponseWithExample" />
      </template>
      <!-- Without Schema: Don't show tabs -->
      <ExampleResponse
        v-else
        :id="id"
        :response="currentResponseWithExample" />
    </ScalarCardSection>
    <ScalarCardFooter
      v-if="currentResponse?.description || hasMultipleExamples"
      class="response-card-footer">
      <ExamplePicker
        v-if="hasMultipleExamples"
        class="response-example-selector"
        :examples="currentJsonResponse?.examples"
        v-model="selectedExampleKey" />
      <div
        v-else-if="currentResponse?.description"
        class="response-description">
        <ScalarMarkdown
          class="markdown"
          :value="currentResponse.description" />
      </div>
    </ScalarCardFooter>
  </ScalarCard>
</template>

<style scoped>
.response-card {
  font-size: var(--scalar-font-size-3);
}

.markdown :deep(*) {
  margin: 0;
}
.code-copy {
  display: flex;
  align-items: center;
  justify-content: center;
  appearance: none;
  -webkit-appearance: none;
  outline: none;
  background: transparent;
  cursor: pointer;
  color: var(--scalar-color-3);
  border: none;
  padding: 0;
  margin-right: 12px;
}
.code-copy:hover {
  color: var(--scalar-color-1);
}
.code-copy svg {
  width: 13px;
  height: 13px;
}
.response-card-footer {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  padding: 10px 12px;
  gap: 8px;
}
.response-example-selector {
  align-self: flex-start;
  margin: -4px;
}
.response-description {
  font-weight: var(--scalar-semibold);
  font-size: var(--scalar-mini);
  color: var(--scalar-color--1);

  display: flex;
  align-items: center;
  box-sizing: border-box;
}
.schema-type {
  font-size: var(--scalar-micro);
  color: var(--scalar-color-2);
  font-weight: var(--scalar-semibold);
  background: var(--scalar-background-3);
  padding: 2px 4px;
  border-radius: 4px;
  margin-right: 4px;
}
.schema-example {
  font-size: var(--scalar-micro);
  color: var(--scalar-color-2);
  font-weight: var(--scalar-semibold);
}

.example-response-tab {
  display: block;
  margin: 6px;
}

.scalar-card-checkbox {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  min-height: 17px;
  cursor: pointer;
  user-select: none;
  font-size: var(--scalar-small);
  font-weight: var(--scalar-font-normal);
  color: var(--scalar-color-2);
  width: fit-content;
  white-space: nowrap;
  margin-right: 9px;
  gap: 6px;
}
.scalar-card-checkbox:has(.scalar-card-checkbox-input:focus-visible)
  .scalar-card-checkbox-checkmark {
  outline: 1px solid var(--scalar-color-accent);
}
.scalar-card-checkbox:hover {
  color: var(--scalar-color--1);
}
.scalar-card-checkbox .scalar-card-checkbox-input {
  position: absolute;
  opacity: 0;
  cursor: pointer;
  height: 0;
  width: 0;
}

.scalar-card-checkbox-checkmark {
  height: 17px;
  width: 17px;
  border-radius: var(--scalar-radius);
  background-color: transparent;
  background-color: var(--scalar-background-3);
  box-shadow: inset 0 0 0 var(--scalar-border-width) var(--scalar-border-color);
}
.scalar-card-checkbox:has(.scalar-card-checkbox-input:checked) {
  color: var(--scalar-color-1);
  font-weight: var(--scalar-semibold);
}

.scalar-card-checkbox
  .scalar-card-checkbox-input:checked
  ~ .scalar-card-checkbox-checkmark {
  background-color: var(--scalar-button-1);
  box-shadow: none;
}

.scalar-card-checkbox-checkmark:after {
  content: '';
  position: absolute;
  display: none;
}

.scalar-card-checkbox
  .scalar-card-checkbox-input:checked
  ~ .scalar-card-checkbox-checkmark:after {
  display: block;
}

.scalar-card-checkbox .scalar-card-checkbox-checkmark:after {
  right: 6px;
  top: 36.5%;
  width: 5px;
  height: 9px;
  border: solid 1px var(--scalar-button-1-color);
  border-width: 0 1.5px 1.5px 0;
  transform: rotate(45deg);
}
</style>
