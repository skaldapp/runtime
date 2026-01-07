<template lang="pug">
router-view(v-slot="{ Component }")
  component(:is="Component", :id="nodes[0]?.id")
</template>
<script setup lang="ts">
import type { TPage } from "@vuebro/shared";

import { useHead } from "@unhead/vue";
import { sharedStore } from "@vuebro/shared";
import { computed, toRefs } from "vue";
import { useRoute } from "vue-router";

/* -------------------------------------------------------------------------- */

const route = useRoute();

/* -------------------------------------------------------------------------- */

const { kvNodes, nodes } = toRefs(sharedStore);

/* -------------------------------------------------------------------------- */

const input = computed(
  () => kvNodes.value[route.name as keyof TPage]?.frontmatter,
);

/* -------------------------------------------------------------------------- */

useHead(nodes.value[0]?.frontmatter, { mode: "client" });
useHead(input, { mode: "client" });
</script>
