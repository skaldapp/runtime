<template lang="pug">
AsyncComponent(@vue:mounted="promises.get(id)?.resolve(undefined)")
</template>

<script setup lang="ts">
import type { SerializableHead } from "unhead/types";

import { sharedStore } from "@skaldapp/shared";
import { useHead } from "@unhead/vue";
import { computed, toRefs, watchEffect } from "vue";

import { module, promises, promiseWithResolvers } from "@/stores/main";

const { id } = defineProps<{ id: string }>();

const AsyncComponent = computed(() => module(id)),
  { kvNodes } = toRefs(sharedStore);

const input = computed(() => {
  if (kvNodes.value[id]) {
    const {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      frontmatter: { attrs, hidden, icon, template, ...head },
    } = kvNodes.value[id];
    const {
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
    const { keywords, ...flatMeta } = _flatMeta as Record<string, unknown> & {
      keywords?: string | string[];
    };

    return {
      _flatMeta: {
        ...flatMeta,
        ...(keywords && {
          keywords: Array.isArray(keywords) ? keywords.join(",") : keywords,
        }),
      },
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

useHead(input);

watchEffect(() => {
  promises.set(id, promiseWithResolvers());
});
</script>
