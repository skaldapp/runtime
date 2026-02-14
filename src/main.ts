import type { TPage } from "@skaldapp/shared";
import type { RouteRecordRaw, RouterScrollBehavior } from "vue-router";

import { sharedStore } from "@skaldapp/shared";
import { createHead } from "@unhead/vue/client";
import { toReactive, useFetch, whenever } from "@vueuse/core";
import { jsonrepair } from "jsonrepair";
import {
  AliasSortingPlugin,
  CanonicalPlugin,
  FlatMetaPlugin,
  InferSeoMetaPlugin,
  TemplateParamsPlugin,
} from "unhead/plugins";
import { createApp, nextTick, toRefs } from "vue";

import "@/style.css";
import "virtual:uno.css"; // eslint-disable-line import-x/no-unresolved
import "automad-prism-themes/dist/prism-github.light-dark.css";
import { createRouter, createWebHistory } from "vue-router";

import vueApp from "@/App.vue";
import notFoundView from "@/views/NotFoundView.vue";
import component from "@/views/PageView.vue";

const app = createApp(vueApp),
  behavior = "smooth",
  top = 0,
  { data, isFinished } = useFetch("./docs/index.json").text(),
  { kvNodes, nodes, tree } = toRefs(sharedStore),
  { pathname } = new URL(document.baseURI),
  { removeHiddens } = sharedStore;
const history = createWebHistory(pathname),
  scrollBehavior: RouterScrollBehavior = ({ hash: el }, _from, savedPosition) =>
    savedPosition ?? { behavior, ...(el ? { el } : { top }) };

whenever(
  isFinished,
  async () => {
    tree.value = JSON.parse(jsonrepair(data.value ?? "[{}]"));
    await nextTick();

    const routes = [
        ...(removeHiddens(nodes.value, true).flatMap((node) => {
          const right: TPage[] = [node];
          while (
            right.length !==
            right.push(
              ...(right[right.length - 1]?.frontmatter["template"]
                ? removeHiddens(right[right.length - 1]?.children ?? []).slice(
                    0,
                    1,
                  )
                : []),
            )
          );
          right.shift();
          const [last, ...rest] = [
            ...removeHiddens(node.branch),
            ...right,
          ].reverse();
          return [
            ...right.map(({ to }) => ({ path: to, redirect: node.to })),
            ...[
              ...(last ? [last] : []),
              ...rest.filter(({ frontmatter: { template } }) => template),
            ].reduce(
              (children: object[], { id }, index, array) => [
                {
                  props: { id },
                  ...(children.length ? { children } : undefined),
                  component,
                  path: index === array.length - 1 ? node.to : "",
                  ...(index ? undefined : { name: node.id }),
                },
              ],
              [],
            ),
          ];
        }) as RouteRecordRaw[]),
        { component: notFoundView, name: "404", path: "/:pathMatch(.*)*" },
      ],
      router = createRouter({ history, routes, scrollBehavior });

    app.use(router);
    await router.isReady();
    app.mount("#app");
  },
  { once: true },
);

app
  .use(
    createHead({
      plugins: [
        TemplateParamsPlugin,
        AliasSortingPlugin,
        FlatMetaPlugin,
        CanonicalPlugin({}),
        InferSeoMetaPlugin(),
      ],
    }),
  )
  .provide("docs", toReactive(kvNodes));

console.info(
  "Skald / https://github.com/skaldapp / runtime ver.:",
  __APP_VERSION__,
);
