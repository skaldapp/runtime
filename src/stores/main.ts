import type { MarkdownItEnv } from "@mdit-vue/types";
import type { TPage } from "@vuebro/shared";
import type { UnocssPluginContext } from "unocss";
import type { RouteRecordNameGeneric } from "vue-router";

import hljs from "@highlightjs/cdn-assets/es/highlight";
import { componentPlugin } from "@mdit-vue/plugin-component";
import { frontmatterPlugin } from "@mdit-vue/plugin-frontmatter";
import { sfcPlugin } from "@mdit-vue/plugin-sfc";
import { tocPlugin } from "@mdit-vue/plugin-toc";
import { abbr } from "@mdit/plugin-abbr";
import { align } from "@mdit/plugin-align";
import { attrs } from "@mdit/plugin-attrs";
import { demo } from "@mdit/plugin-demo";
import { dl } from "@mdit/plugin-dl";
import { figure } from "@mdit/plugin-figure";
import { footnote } from "@mdit/plugin-footnote";
import { icon } from "@mdit/plugin-icon";
import { imgLazyload } from "@mdit/plugin-img-lazyload";
import { imgMark } from "@mdit/plugin-img-mark";
import { imgSize } from "@mdit/plugin-img-size";
import { ins } from "@mdit/plugin-ins";
import { katex } from "@mdit/plugin-katex";
import { mark } from "@mdit/plugin-mark";
import { ruby } from "@mdit/plugin-ruby";
import { spoiler } from "@mdit/plugin-spoiler";
import { sub } from "@mdit/plugin-sub";
import { sup } from "@mdit/plugin-sup";
import { tasklist } from "@mdit/plugin-tasklist";
import { ElementTransform } from "@nolebase/markdown-it-element-transform";
import transformerDirectives from "@unocss/transformer-directives";
import loadModule from "@vuebro/loader-sfc";
import { fetching, sharedStore } from "@vuebro/shared";
import MagicString from "magic-string";
import MarkdownIt from "markdown-it";
import { full } from "markdown-it-emoji";
import { computed, defineAsyncComponent, reactive, toRefs } from "vue";

/* -------------------------------------------------------------------------- */

interface PromiseWithResolvers<T> {
  promise: Promise<T>;
  reject: (reason?: unknown) => void;
  resolve: (value: PromiseLike<T> | T) => void;
}

/* -------------------------------------------------------------------------- */

let transformNextLinkCloseToken = false;

/* -------------------------------------------------------------------------- */

const { kvNodes, nodes } = toRefs(sharedStore),
  { transform } = transformerDirectives();

/* -------------------------------------------------------------------------- */

const md: MarkdownIt = MarkdownIt({
  highlight: (code: string, language: string) =>
    `<pre><code class="hljs">${
      (language && hljs.getLanguage(language)
        ? hljs.highlight(code, { language }).value
        : md.utils.escapeHtml(code)) as string
    }</code></pre>`,
  html: true,
  linkify: true,
  typographer: true,
})
  .use(ElementTransform, {
    transform(token) {
      switch (token.type) {
        case "link_close":
          if (transformNextLinkCloseToken) {
            token.tag = "RouterLink";
            transformNextLinkCloseToken = false;
          }
          break;
        case "link_open": {
          const href = token.attrGet("href") ?? "/";
          if (!URL.canParse(href)) {
            token.tag = "RouterLink";
            token.attrSet("to", href);
            token.attrs?.splice(token.attrIndex("href"), 1);
            transformNextLinkCloseToken = true;
          }
          break;
        }
      }
    },
  })
  .use(full)
  .use(abbr)
  .use(align)
  .use(attrs)
  .use(demo)
  .use(dl)
  .use(figure)
  .use(footnote)
  .use(icon)
  .use(imgLazyload)
  .use(imgMark)
  .use(imgSize)
  .use(ins)
  .use(katex)
  .use(mark)
  .use(ruby)
  .use(spoiler)
  .use(sub)
  .use(sup)
  .use(tasklist)
  .use(frontmatterPlugin)
  .use(tocPlugin)
  .use(componentPlugin)
  .use(sfcPlugin);

/* -------------------------------------------------------------------------- */

export const promiseWithResolvers = <T>() => {
    let resolve!: PromiseWithResolvers<T>["resolve"];
    let reject!: PromiseWithResolvers<T>["reject"];
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, reject, resolve };
  },
  mainStore = reactive({
    $these: computed((): TPage[] =>
      mainStore.these.filter(({ frontmatter: { hidden } }) => !hidden),
    ),
    intersecting: new Map<string, boolean | undefined>(),
    module: (id: string) =>
      defineAsyncComponent(async () => {
        const env: MarkdownItEnv = {},
          { uno } = mainStore;

        md.render((await fetching(`./pages/${id}.md`)) ?? "", env);

        const injector = `
const $id = "${id}";
const $frontmatter = ${JSON.stringify(env.frontmatter ?? {})};
`,
          styles =
            env.sfcBlocks?.styles.map(
              ({ contentStripped, tagClose, tagOpen }) => ({
                contentStripped: new MagicString(contentStripped),
                tagClose,
                tagOpen,
              }),
            ) ?? [];

        await Promise.all(
          styles.map(
            async ({ contentStripped }) =>
              // @ts-expect-error a temporary fix due to the unocss bug
              await transform(contentStripped, id, {
                uno,
              } as UnocssPluginContext),
          ),
        );

        return loadModule(
          `${env.sfcBlocks?.template?.content ?? ""}
${env.sfcBlocks?.script?.content ?? ""}
${
  env.sfcBlocks?.scriptSetup
    ? `${env.sfcBlocks.scriptSetup.tagOpen}${injector}${env.sfcBlocks.scriptSetup.contentStripped}${env.sfcBlocks.scriptSetup.tagClose}`
    : `<script setup>${injector}</script>`
}
${styles
  .map(
    ({ contentStripped, tagClose, tagOpen }) =>
      `${tagOpen}${contentStripped.toString()}${tagClose}}`,
  )
  .join("\n")}
`,
          { scriptOptions: { inlineTemplate: true } },
        );
      }),
    promises: new Map<string, PromiseWithResolvers<unknown>>(),
    root: promiseWithResolvers(),
    routeName: undefined as RouteRecordNameGeneric,
    scrollLock: false,
    that: computed((): TPage | undefined =>
      mainStore.routeName === nodes.value[0]?.id
        ? nodes.value[0]?.$children[0]
        : kvNodes.value[mainStore.routeName as keyof object],
    ),
    these: computed((): TPage[] =>
      mainStore.that === undefined || mainStore.that.parent?.frontmatter["flat"]
        ? (mainStore.that?.siblings ?? [])
        : [mainStore.that],
    ),
    uno: {},
  });
