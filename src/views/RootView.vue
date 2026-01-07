<template lang="pug">
Suspense
  div(v-if="!nodes[0]?.frontmatter['hidden']", :id="nodes[0]?.id", un-cloak)
    div(v-bind="nodes[0]?.frontmatter['attrs'] ?? {}")
      component(:is, @vue:mounted="root.resolve(undefined)")
</template>

<script setup lang="ts">
import { sharedStore } from "@vuebro/shared";
import { computed } from "vue";

import { mainStore } from "@/stores/main";

const nodes = $toRef(sharedStore, "nodes"),
  { module, root } = mainStore;
const is = computed(() => nodes[0] && module(nodes[0].id));
</script>
