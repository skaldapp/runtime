import type { RouteRecordRaw, RouterScrollBehavior } from "vue-router";

import { sharedStore } from "@skaldapp/shared";
import { createHead } from "@unhead/vue/client";
import { toReactive, useFetch, whenever } from "@vueuse/core";
import {
  AliasSortingPlugin,
  CanonicalPlugin,
  FlatMetaPlugin,
  InferSeoMetaPlugin,
  TemplateParamsPlugin,
} from "unhead/plugins";
import { createApp, nextTick, toRefs } from "vue";
import { createRouter, createWebHistory } from "vue-router";

import "@/style.css";
import "virtual:uno.css"; // eslint-disable-line import-x/no-unresolved
import "automad-prism-themes/dist/prism-github.light-dark.css";

import vueApp from "@/App.vue";
import notFoundView from "@/views/NotFoundView.vue";
import component from "@/views/PageView.vue";

const app = createApp(vueApp),
  behavior = "smooth",
  top = 0,
  { $nodes, kvNodes } = toRefs(sharedStore),
  { data, isFinished } = useFetch("./docs/index.json").json(),
  { pathname } = new URL(document.baseURI);
const history = createWebHistory(pathname),
  scrollBehavior: RouterScrollBehavior = ({ hash: el }, _from, savedPosition) =>
    savedPosition ?? { behavior, ...(el ? { el } : { top }) };

whenever(
  isFinished,
  async () => {
    sharedStore.tree = data.value ?? [];
    await nextTick();

    const routes = [
        ...($nodes.value
          .filter(
            ({ $children, frontmatter: { template }, path }) =>
              path !== undefined && (!template || !$children.length),
          )
          .flatMap(({ $branch, $prev, id: name, parent, to }) => {
            const [last, ...rest] = [...$branch].reverse(),
              path = parent?.frontmatter["template"] && !$prev ? parent.to : to;

            return [
              ...(parent?.frontmatter["template"] && !$prev
                ? [{ path: to, redirect: parent.to }]
                : []),
              ...[
                ...(last ? [last] : []),
                ...rest.filter(({ frontmatter: { template } }) => template),
              ].reduce(
                (children: object[], { id }, index, array) => [
                  {
                    props: { id },
                    ...(children.length ? { children } : undefined),
                    component,
                    path: index === array.length - 1 ? path : "",
                    ...(index ? undefined : { name }),
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
