<template lang="pug">
AsyncComponent(@vue:mounted="promises.get(id)?.resolve(undefined)")
</template>

<script setup lang="ts">
import { computed, watchEffect } from "vue";

import { curId, module, promises, promiseWithResolvers } from "@/stores/main";

const { id } = defineProps<{ id: string }>();
const AsyncComponent = computed(() => module(id));

watchEffect(() => {
  curId.value = id;
  promises.set(id, promiseWithResolvers());
});
</script>
