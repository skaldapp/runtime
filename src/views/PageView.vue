<template lang="pug">
div(
  v-for="[id, is] in templates",
  :id,
  :key="id",
  v-element-visibility="[(state)=>{intersecting.set(id,state)},{threshold:0.1}]"
)
  div(v-bind="kvNodes[id]?.frontmatter['attrs'] ?? {}")
    component(:is, @vue:mounted="promises.get(id)?.resolve(undefined)")
</template>

<script setup lang="ts">
import { sharedStore } from "@skaldapp/shared";
import { vElementVisibility } from "@vueuse/components";
import { computed, toRefs } from "vue";

import { mainStore, promiseWithResolvers } from "@/stores/main";

const { id } = defineProps<{ id: string }>();

const { intersecting, module, promises } = mainStore,
  { kvNodes } = toRefs(sharedStore);

const current = kvNodes.value[id],
  $these = current?.parent?.frontmatter["flat"]
    ? current.siblings
    : [...(current ? [current] : [])];

const templates = computed(
  () => new Map($these.map(({ id }) => [id, module(id)])),
);

$these.forEach(({ id }) => {
  intersecting.set(id, false);
  promises.set(id, promiseWithResolvers());
});
</script>
