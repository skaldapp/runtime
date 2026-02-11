<template lang="pug">
div(
  v-bind="{ id, ...(kvNodes[id]?.frontmatter['attrs'] instanceof Object && kvNodes[id]?.frontmatter['attrs']) }"
)
  component(:is, @vue:mounted="mounted($el)")
</template>

<script setup lang="ts">
import type { SerializableHead } from "unhead/types";

import { sharedStore } from "@skaldapp/shared";
import { useHead } from "@unhead/vue";
import { computed, toRefs, watchEffect } from "vue";

import { getExtractAll, getToggleObserver, module } from "@/stores/main";

const { id } = defineProps<{ id: string }>();

const extractAll = getExtractAll(),
  is = computed(() => module(id)),
  toggleObserver = getToggleObserver(),
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
  }),
  mounted = async (el: Element) => {
    await extractAll?.(
      el.nodeType === 1 ? el : (el.parentElement ?? undefined),
    );
    toggleObserver?.(false);
  };

useHead(input, { mode: "client" });

watchEffect(() => {
  toggleObserver?.(!!id);
});
</script>
