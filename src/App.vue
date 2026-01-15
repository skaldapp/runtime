<template lang="pug">
router-view(v-slot="{ Component }")
  component(:is="Component", :id="nodes[0]?.id")
</template>
<script setup lang="ts">
import type { TPage } from "@skaldapp/shared";

import { sharedStore } from "@skaldapp/shared";
import { useHead } from "@unhead/vue";
import { computed, toRefs } from "vue";
import { useRoute } from "vue-router";

const route = useRoute(),
  { kvNodes, nodes } = toRefs(sharedStore);
const input = computed(
  () => kvNodes.value[route.name as keyof TPage]?.frontmatter,
);

useHead(nodes.value[0]?.frontmatter, { mode: "client" });
useHead(input, { mode: "client" });
</script>
