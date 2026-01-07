import type { TPage } from "@vuebro/shared";

import { InferSeoMetaPlugin } from "@unhead/addons";
import { createHead } from "@unhead/vue/client";
import initUnocssRuntime from "@unocss/runtime";
import presets from "@vuebro/configs/uno/presets";
import { fetching, sharedStore } from "@vuebro/shared";
import { toReactive, useScroll } from "@vueuse/core";
import { consola } from "consola/browser";
import {
  AliasSortingPlugin,
  CanonicalPlugin,
  TemplateParamsPlugin,
} from "unhead/plugins";
import { createApp, toRefs } from "vue";
import { createRouter, createWebHistory } from "vue-router";

import vueApp from "@/App.vue";
import { mainStore } from "@/stores/main";
import "@/style.css";
import notFoundView from "@/views/NotFoundView.vue";
import pageView from "@/views/PageView.vue";
import rootView from "@/views/RootView.vue";

import "@highlightjs/cdn-assets/styles/default.css";
import "katex/dist/katex.css";

let routeName = $toRef(mainStore, "routeName");

const { $these, that } = $(toRefs(mainStore));
const { kvNodes, nodes } = $(toRefs(sharedStore));

const app = createApp(vueApp),
  index = (await fetching("index.json")) ?? [],
  { intersecting, promises, root } = mainStore,
  { pathname } = new URL(document.baseURI);

consola.info(
  "👊 VueBro / https://github.com/vuebro / runtime ver.:",
  __APP_VERSION__,
);

sharedStore.tree = index;

await initUnocssRuntime({
  defaults: {
    presets: presets({
      iconsOptions: { extraProperties: { display: "inline-block" } },
    }),
  },
  ready: ({ extractAll, toggleObserver, uno }) => {
    mainStore.uno = uno;
    let scrollLock = false;
    const router = createRouter({
        history: createWebHistory(pathname),
        routes: [
          ...(nodes as TPage[])
            .filter(({ path }) => path !== undefined)
            .map(({ id: name, to: path = "/" }) => ({
              children: [{ component: pageView, name, path: "" }],
              component: rootView,
              path,
            })),
          { component: notFoundView, name: "404", path: "/:pathMatch(.*)*" },
        ],
        scrollBehavior: async ({ hash, name }) => {
          if (name) {
            routeName = name;
            if (scrollLock) scrollLock = false;
            else {
              const { index, parent: { frontmatter: { flat } = {} } = {} } =
                that ?? {};
              toggleObserver(true);
              await root.promise;
              await Promise.all(
                [...promises.values()].map(({ promise }) => promise),
              );
              await extractAll();
              toggleObserver(false);
              if ("requestIdleCallback" in window)
                await new Promise((resolve) => requestIdleCallback(resolve));
              else {
                await new Promise((resolve) => requestAnimationFrame(resolve));
                await new Promise((resolve) => setTimeout(resolve));
              }
              return {
                behavior: "smooth" as ScrollOptions["behavior"],
                ...(hash || (flat && index)
                  ? { el: hash || `#${String(name)}` }
                  : { left: 0, top: 0 }),
              };
            }
          }
          return false;
        },
      }),
      { x, y } = $(
        useScroll(window, {
          onStop: () => {
            const [first] = $these,
              [root] = nodes;
            if (root && first) {
              const {
                $children: [{ id } = {}],
              } = root;
              const name =
                !Math.floor(x) && !Math.floor(y) && first.id === id
                  ? root.id
                  : ([...intersecting.entries()].find(
                      ([, value]) => value,
                    )?.[0] ?? first.id);
              if (name !== routeName) {
                scrollLock = true;
                router.push({ name }).catch(consola.error);
              }
            }
          },
        }),
      );

    router.beforeEach(({ path }) =>
      path !== decodeURI(path) ? decodeURI(path) : undefined,
    );

    app.use(router);

    return false;
  },
  rootElement: () => document.getElementById("app") ?? undefined,
});

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
  .provide("pages", toReactive(kvNodes))
  .mount("#app");
