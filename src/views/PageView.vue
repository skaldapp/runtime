<template lang="pug">
AsyncComponent(@vue:mounted="promises.get(id)?.resolve(undefined)")
</template>

<script setup lang="ts">
import { computed, watchEffect } from "vue";

import { module, promises, promiseWithResolvers } from "@/stores/main";

const { id } = defineProps<{ id: string }>();
const AsyncComponent = computed(() => module(id));

watchEffect(() => {
  promises.set(id, promiseWithResolvers());
});
</script>
