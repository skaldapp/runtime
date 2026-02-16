import type { MarkdownItEnv } from "@mdit-vue/types";
import type { UnocssPluginContext, UnoGenerator } from "@unocss/core";

import { componentPlugin } from "@mdit-vue/plugin-component";
import { frontmatterPlugin } from "@mdit-vue/plugin-frontmatter";
import { sfcPlugin } from "@mdit-vue/plugin-sfc";
import { tocPlugin } from "@mdit-vue/plugin-toc";
import { spoiler } from "@mdit/plugin-spoiler";
import { tasklist } from "@mdit/plugin-tasklist";
import { ElementTransform } from "@nolebase/markdown-it-element-transform";
import loadModule from "@skaldapp/loader-sfc";
import transformerDirectives from "@unocss/transformer-directives";
import mk from "@vscode/markdown-it-katex";
import { useFetch } from "@vueuse/core";
import { toHtml } from "hast-util-to-html";
import MagicString from "magic-string";
import MarkdownIt from "markdown-it";
import abbr from "markdown-it-abbr";
import anchor from "markdown-it-anchor";
import deflist from "markdown-it-deflist";
import { full } from "markdown-it-emoji";
import footnote from "markdown-it-footnote";
import ins from "markdown-it-ins";
import mark from "markdown-it-mark";
import pluginMdc from "markdown-it-mdc";
import sub from "markdown-it-sub";
import sup from "markdown-it-sup";
import { refractor } from "refractor";
import twemoji from "twemoji";
import { defineAsyncComponent } from "vue";

interface PromiseWithResolvers<T> {
  promise: Promise<T>;
  reject: (reason?: unknown) => void;
  resolve: (value: PromiseLike<T> | T) => void;
}

let transformNextLinkCloseToken = false,
  uno: null | UnoGenerator = null;

const html = true,
  inlineTemplate = true,
  linkify = true,
  typographer = true,
  xhtmlOut = true,
  // eslint-disable-next-line sonarjs/disabled-auto-escaping
  md: MarkdownIt = MarkdownIt({
    highlight: (code, lang) => {
      const language = lang.toLowerCase(),
        classAttr = language && ` class="language-${language}"`;
      return `<pre><code${classAttr}>${
        refractor.registered(language)
          ? toHtml(refractor.highlight(code, language))
          : md.utils.escapeHtml(code)
      }</code></pre>`;
    },
    html,
    linkify,
    typographer,
    xhtmlOut,
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
    .use(anchor)
    .use(full)
    .use(abbr)
    .use(deflist)
    .use(footnote)
    .use(ins)
    .use(mk)
    .use(mark)
    .use(spoiler)
    .use(sub)
    .use(sup)
    .use(tasklist)
    .use(pluginMdc)
    .use(frontmatterPlugin)
    .use(tocPlugin, { linkTag: "router-link" })
    .use(componentPlugin)
    .use(sfcPlugin),
  scriptOptions = { inlineTemplate },
  { transform } = transformerDirectives();

md.renderer.rules["emoji"] = (tokens, idx) =>
  tokens[idx] ? twemoji.parse(tokens[idx].content) : "";

export const module = (id: string) =>
    defineAsyncComponent(async () => {
      const env: MarkdownItEnv = {},
        { data } = await useFetch(`./docs/${id}.md`).text();

      md.render(data.value ?? "", env);

      const { frontmatter = {}, sfcBlocks } = env,
        injector = `
const $id = "${id}";
const $frontmatter = ${JSON.stringify(frontmatter)};
`,
        styles =
          sfcBlocks?.styles.map(({ contentStripped, tagClose, tagOpen }) => ({
            contentStripped: new MagicString(contentStripped),
            tagClose,
            tagOpen,
          })) ?? [];

      await Promise.all(
        styles.map(
          async ({ contentStripped }) =>
            uno &&
            transform(contentStripped, id, { uno } as UnocssPluginContext),
        ),
      );

      return loadModule(
        `${env.sfcBlocks?.template?.content ?? ""}
${sfcBlocks?.script?.content ?? ""}
${
  sfcBlocks?.scriptSetup
    ? `${sfcBlocks.scriptSetup.tagOpen}${injector}${sfcBlocks.scriptSetup.contentStripped}${sfcBlocks.scriptSetup.tagClose}`
    : `<script setup>${injector}</script>`
}
${styles
  .map(
    ({ contentStripped, tagClose, tagOpen }) =>
      `${tagOpen}${contentStripped.toString()}${tagClose}}`,
  )
  .join("\n")}
`,
        { scriptOptions },
      );
    }),
  promises = new Map<string, PromiseWithResolvers<unknown>>(),
  promiseWithResolvers = <T>() => {
    let resolve!: PromiseWithResolvers<T>["resolve"];
    let reject!: PromiseWithResolvers<T>["reject"];
    const promise = new Promise<T>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, reject, resolve };
  },
  setUno = (unoGenerator: UnoGenerator) => {
    uno = unoGenerator;
  };
