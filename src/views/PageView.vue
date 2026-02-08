<template lang="pug">
component(:is)
</template>

<script setup lang="ts">
import type { SerializableHead } from "unhead/types";

import { sharedStore } from "@skaldapp/shared";
import { useHead } from "@unhead/vue";
import { computed, toRefs } from "vue";

import module from "@/stores/main";

const { id } = defineProps<{ id: string }>();
const is = computed(() => module(id)),
  { kvNodes } = toRefs(sharedStore);
const input = computed(() => {
  if (kvNodes.value[id]) {
    const {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        frontmatter: { attrs, hidden, icon, template, ...head },
      } = kvNodes.value[id],
      {
        base, // eslint-disable-line @typescript-eslint/no-unused-vars
        bodyAttrs,
        htmlAttrs,
        link,
        meta,
        noscript,
        script,
        style,
        templateParams,
        title,
        titleTemplate,
        ..._flatMeta
      } = head as SerializableHead;

    return {
      _flatMeta,
      ...(bodyAttrs && { bodyAttrs }),
      ...(htmlAttrs && { htmlAttrs }),
      link,
      meta,
      noscript,
      script,
      style,
      ...(templateParams && { templateParams }),
      title,
      ...(titleTemplate && { titleTemplate }),
    };
  } else return undefined;
});

useHead(input, { mode: "client" });
</script>
