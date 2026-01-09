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
import { computed, onUnmounted, toRef, watchEffect } from "vue";

import { mainStore, promiseWithResolvers } from "@/stores/main";

/* -------------------------------------------------------------------------- */

const $these = toRef(mainStore, "$these"),
  kvNodes = toRef(sharedStore, "kvNodes");

/* -------------------------------------------------------------------------- */

const { intersecting, module, promises } = mainStore;

/* -------------------------------------------------------------------------- */

const clear = () => {
    [intersecting, promises].forEach((map) => {
      map.clear();
    });
  },
  templates = computed(
    () => new Map($these.value.map(({ id }) => [id, module(id)])),
  );

/* -------------------------------------------------------------------------- */

watchEffect(() => {
  clear();
  $these.value.forEach(({ id }) => {
    intersecting.set(id, false);
    promises.set(id, promiseWithResolvers());
  });
});

onUnmounted(clear);
</script>
