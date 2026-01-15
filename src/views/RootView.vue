<template lang="pug">
Suspense
  div(v-if="!nodes[0]?.frontmatter['hidden']", :id="nodes[0]?.id")
    div(v-bind="nodes[0]?.frontmatter['attrs'] ?? {}")
      component(:is, @vue:mounted="root.resolve(undefined)")
</template>

<script setup lang="ts">
import { sharedStore } from "@skaldapp/shared";
import { computed, toRefs } from "vue";

import { mainStore } from "@/stores/main";

const { module, root } = mainStore,
  { nodes } = toRefs(sharedStore);
const is = computed(() => nodes.value[0] && module(nodes.value[0].id));
</script>
