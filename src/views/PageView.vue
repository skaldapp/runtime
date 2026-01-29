<template lang="pug">
component(:is)
</template>

<script setup lang="ts">
import { sharedStore } from "@skaldapp/shared";
import { useHead } from "@unhead/vue";
import { computed, toRefs } from "vue";

import module from "@/stores/main";

const { id } = defineProps<{ id: string }>();
const is = computed(() => module(id)),
  { kvNodes } = toRefs(sharedStore);
const frontmatter = computed(() => kvNodes.value[id]?.frontmatter);

useHead(frontmatter, { mode: "client" });
</script>
