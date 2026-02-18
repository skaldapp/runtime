import type { TPage } from "@skaldapp/shared";
import type { RuntimeContext } from "@unocss/runtime";
import type { RouteRecordRaw, RouterScrollBehavior } from "vue-router";

import presets from "@skaldapp/configs/uno/presets";
import { sharedStore } from "@skaldapp/shared";
import { createHead } from "@unhead/vue/client";
import initUnocssRuntime from "@unocss/runtime";
import { toReactive } from "@vueuse/core";
import { jsonrepair } from "jsonrepair";

import "@/style.css";
import "automad-prism-themes/dist/prism-nord.css";
import { ofetch } from "ofetch";
import {
  AliasSortingPlugin,
  CanonicalPlugin,
  FlatMetaPlugin,
  InferSeoMetaPlugin,
  TemplateParamsPlugin,
} from "unhead/plugins";
import { createApp, nextTick, toRefs } from "vue";
import { createRouter, createWebHistory } from "vue-router";

import vueApp from "@/App.vue";
import { promises, setUno } from "@/stores/main";
import notFoundView from "@/views/NotFoundView.vue";
import component from "@/views/PageView.vue";

const app = createApp(vueApp),
  behavior = "smooth",
  display = "inline-block",
  extraProperties = { display },
  { pathname } = new URL(document.baseURI),
  history = createWebHistory(pathname),
  iconsOptions = { extraProperties },
  index = ofetch("./docs/index.json", { responseType: "text" }),
  top = 0,
  { kvNodes, nodes, tree } = toRefs(sharedStore),
  { removeHiddens } = sharedStore;

const ready = async ({ extractAll, toggleObserver, uno }: RuntimeContext) => {
  tree.value = JSON.parse(jsonrepair((await index) || "[{}]"));
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
    scrollBehavior: RouterScrollBehavior = async (
      { hash: el, name: toName },
      { name: fromName },
    ) => {
      if (fromName !== toName) {
        let promisesSize = 0;
        while (promises.size > promisesSize) {
          promisesSize = promises.size;
          await Promise.all(
            [...promises.values()].map(({ promise }) => promise),
          );
        }
        promises.clear();
        await extractAll();
        if ("requestIdleCallback" in window)
          await new Promise((resolve) => requestIdleCallback(resolve));
        else {
          await new Promise((resolve) => requestAnimationFrame(resolve));
          await new Promise((resolve) => setTimeout(resolve));
        }
        toggleObserver(false);
      }

      return { ...(el ? { el } : { top }), behavior };
    },
    router = createRouter({ history, routes, scrollBehavior });

  setUno(uno);

  router.beforeEach(({ name: toName }, { name: fromName }) => {
    if (toName !== fromName) toggleObserver(true);
  });

  app.use(router);
  app.mount("#app");
};

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

void initUnocssRuntime({
  defaults: { presets: presets({ iconsOptions }) },
  ready,
});

console.info(
  "Skald / https://github.com/skaldapp / runtime ver.:",
  __APP_VERSION__,
);
