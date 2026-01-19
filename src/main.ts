import type { RouteRecordRaw } from "vue-router";

import { sharedStore } from "@skaldapp/shared";
import { InferSeoMetaPlugin } from "@unhead/addons";
import { createHead } from "@unhead/vue/client";
import { toReactive, useFetch, whenever } from "@vueuse/core";
import {
  AliasSortingPlugin,
  CanonicalPlugin,
  TemplateParamsPlugin,
} from "unhead/plugins";
import { createApp, nextTick, toRefs } from "vue";
import { createRouter, createWebHistory } from "vue-router";

import vueApp from "@/App.vue";
import notFoundView from "@/views/NotFoundView.vue";
import component from "@/views/PageView.vue";

import "@highlightjs/cdn-assets/styles/default.css";

import "@/style.css";
import "virtual:uno.css"; // eslint-disable-line import-x/no-unresolved

const app = createApp(vueApp),
  { data, isFinished } = useFetch("./docs/index.json").json(),
  { kvNodes, nodes } = toRefs(sharedStore),
  { pathname } = new URL(document.baseURI);
const history = createWebHistory(pathname);

whenever(
  isFinished,
  async () => {
    sharedStore.tree = data.value ?? [];
    await nextTick();

    const routes = [
      ...(nodes.value
        .filter(({ path }) => path !== undefined)
        .map(({ branch, id: name, to: path = "/" }) => {
          const [last, ...rest] = [...branch].reverse();
          return !last || last.frontmatter["hidden"]
            ? undefined
            : [
                last,
                ...rest.filter(
                  ({ frontmatter: { hidden, template } }) =>
                    template && !hidden,
                ),
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
              )[0];
        })
        .filter((node) => node !== undefined) as RouteRecordRaw[]),
      { component: notFoundView, name: "404", path: "/:pathMatch(.*)*" },
    ];

    app.use(createRouter({ history, routes })).mount("#app");
  },
  { once: true },
);

app
  .use(
    createHead({
      plugins: [
        TemplateParamsPlugin,
        AliasSortingPlugin,
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
