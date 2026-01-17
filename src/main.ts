import type { TPage } from "@skaldapp/shared";
import type { RouteRecordRaw } from "vue-router";

import presets from "@skaldapp/configs/uno/presets";
import { fetching, sharedStore } from "@skaldapp/shared";
import { InferSeoMetaPlugin } from "@unhead/addons";
import { createHead } from "@unhead/vue/client";
import initUnocssRuntime from "@unocss/runtime";
import { toReactive, useScroll } from "@vueuse/core";
import {
  AliasSortingPlugin,
  CanonicalPlugin,
  TemplateParamsPlugin,
} from "unhead/plugins";
import { createApp, nextTick, toRef, toRefs } from "vue";
import { createRouter, createWebHistory } from "vue-router";

import vueApp from "@/App.vue";
import { mainStore } from "@/stores/main";
import "@/style.css";
import notFoundView from "@/views/NotFoundView.vue";
import component from "@/views/PageView.vue";

import "@highlightjs/cdn-assets/styles/default.css";
import "virtual:uno.css"; // eslint-disable-line import-x/no-unresolved

const app = createApp(vueApp),
  index = (await fetching("index.json")) ?? [],
  routeName = toRef(mainStore, "routeName"),
  { $these, that } = toRefs(mainStore),
  { intersecting, promises } = mainStore,
  { kvNodes, nodes } = toRefs(sharedStore),
  { pathname } = new URL(document.baseURI);

console.info(
  "⛰ Skald / https://github.com/skaldapp / runtime ver.:",
  __APP_VERSION__,
);

sharedStore.tree = index;

await nextTick();

const history = createWebHistory(pathname),
  routes = [
    ...(nodes.value
      .filter(({ path }) => path !== undefined)
      .map(
        ({
          branch,
          children,
          frontmatter: { template },
          id: name,
          to: path = "/",
        }) => {
          const route = branch
            .slice(0, -1)
            .filter(({ frontmatter: { template } }) => template);
          route.push(...branch.slice(-1));
          if (template) route.push(...(children.slice(0, 1) as TPage[]));
          return route.reduceRight(
            (children: object[], { id }, index, array) => [
              {
                props: { id },
                ...(children.length ? { children } : undefined),
                component,
                path: index ? "" : path,
                ...(index === array.length - 1 ? { name } : undefined),
              },
            ],
            [],
          )[0];
        },
      )
      .filter((node) => node !== undefined) as RouteRecordRaw[]),
    { component: notFoundView, name: "404", path: "/:pathMatch(.*)*" },
  ];

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
        history,
        routes,
        scrollBehavior: async ({ hash, name }) => {
          if (name) {
            routeName.value = name;
            if (scrollLock) scrollLock = false;
            else {
              const { index, parent: { frontmatter: { flat } = {} } = {} } =
                that.value ?? {};
              toggleObserver(true);
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
      { x, y } = useScroll(window, {
        onStop: () => {
          const [first] = $these.value,
            [root] = nodes.value;
          if (root && first) {
            const {
              $children: [{ id } = {}],
            } = root;
            const name =
              !Math.floor(x.value) && !Math.floor(y.value) && first.id === id
                ? root.id
                : ([...intersecting.entries()].find(
                    ([, value]) => value,
                  )?.[0] ?? first.id);
            if (name !== routeName.value) {
              scrollLock = true;
              router.push({ name }).catch(console.error);
            }
          }
        },
      });

    console.log(routes);

    router.beforeEach(({ path }) =>
      path !== decodeURI(path) ? decodeURI(path) : undefined,
    );

    router.beforeResolve(() => {
      [intersecting, promises].forEach((map) => {
        map.clear();
      });
    });

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
