<template>
  <Badge
    v-if="showBetaBadge"
    class="api-beta-badge">
    Beta
  </Badge>
</template>

<script setup lang="ts">
import { computed } from 'vue'

import { Badge } from '@/components/Badge'

const { operation } = defineProps<{
  operation?: {
    'x-api-beta'?: boolean
    [key: string]: any
  }
}>()

const showBetaBadge = computed(() => {
  return operation?.['x-api-beta'] === true
})
</script>

<style scoped>
.api-beta-badge {
  font-weight: var(--scalar-bold);
  font-size: var(--scalar-micro);
  color: #9333ea;
  margin-left: 8px;
}
</style>
