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
  routes: RouteRecordRaw[] = [],
  top = 0,
  { isRedirect, LEAD_TRAIL_SLASH_RE } = sharedStore,
  { kvNodes, tree } = toRefs(sharedStore);
const getRoutes = (nodes: TPage[]): RouteRecordRaw[] =>
    nodes.map(
      ({
        $children,
        $parent,
        $prev,
        children: next,
        frontmatter: { hidden, template },
        id,
        name,
        parent,
        path,
        to: redirect,
      }: TPage) => {
        const children = [
            ...(template || hidden || !$children.length
              ? []
              : [{ component, name: id, path: "", props: { id } }]),
            ...getRoutes(next),
          ],
          redirected = isRedirect({ $parent, $prev } as TPage),
          routePath = redirected ? "" : (name ?? "");

        if (path !== undefined && redirect && redirected)
          routes.unshift({
            path: path.replace(LEAD_TRAIL_SLASH_RE, "/"),
            redirect,
          });

        return {
          ...((!template || hidden) && $children.length
            ? undefined
            : { component, name: id, props: { id } }),
          ...(children.length ? { children } : undefined),
          path: parent ? routePath : "/",
        };
      },
    ) as RouteRecordRaw[],
  ready = async ({ extractAll, toggleObserver, uno }: RuntimeContext) => {
    tree.value = JSON.parse(jsonrepair((await index) || "[{}]"));
    await nextTick();

    const scrollBehavior: RouterScrollBehavior = async (
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
    };

    setUno(uno);

    routes.push(...getRoutes(tree.value), {
      component: notFoundView,
      name: "404",
      path: "/:pathMatch(.*)*",
    });

    const router = createRouter({ history, routes, scrollBehavior });

    router.beforeEach(({ name: toName }, { name: fromName }) => {
      if (toName !== fromName) toggleObserver(true);
    });

    app.use(router);
    app.mount("#app");
  };

window.__vue_app__ = app;

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
