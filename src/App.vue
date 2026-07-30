<template lang="pug">
Suspense
  router-view
</template>

<script setup lang="ts">
import type { SerializableHead } from "unhead/types";

import { sharedStore } from "@skaldapp/shared";
import { useHead } from "@unhead/vue";
import { computed, toRefs } from "vue";

import { curId } from "@/stores/main";

const { kvNodes } = toRefs(sharedStore);

const input = computed(() => {
  const node = kvNodes.value[curId.value];
  if (node) {
    const {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      frontmatter: { attrs, hidden, icon, template, ...head },
    } = node;
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
</script>
