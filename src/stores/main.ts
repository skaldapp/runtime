import type { MarkdownItEnv } from "@mdit-vue/types";
import type { UnocssPluginContext, UnoGenerator } from "@unocss/core";
import type { MarkdownExit, Token } from "markdown-exit";

import MarkdownItMdc from "@comark/markdown-it";
import { componentPlugin } from "@mdit-vue/plugin-component";
import { frontmatterPlugin } from "@mdit-vue/plugin-frontmatter";
import { sfcPlugin } from "@mdit-vue/plugin-sfc";
import { tocPlugin } from "@mdit-vue/plugin-toc";
import { ElementTransform } from "@nolebase/markdown-it-element-transform";
import slugify from "@sindresorhus/slugify";
import loadModule from "@skaldapp/loader-sfc";
import transformerDirectives from "@unocss/transformer-directives";
import { useFetch } from "@vueuse/core";
import comarkEmoji from "comark/plugins/emoji";
import math, { renderMath } from "comark/plugins/math";
import comarkTaskList from "comark/plugins/task-list";
import { toHtml } from "hast-util-to-html";
import MagicString from "magic-string";
import { createMarkdownExit } from "markdown-exit";
import anchor from "markdown-it-anchor";
import { refractor } from "refractor";
import { defineAsyncComponent } from "vue";
import { ssrRenderAttrs } from "vue/server-renderer";

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
  linkTag = "router-link",
  typographer = true,
  xhtmlOut = true,
  md: MarkdownExit = createMarkdownExit({
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
    .use(ElementTransform as never, {
      transform(token: Token) {
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
    .use(anchor as never, { slugify })
    .use(MarkdownItMdc)
    .use(frontmatterPlugin as never)
    .use(tocPlugin as never, { linkTag })
    .use(componentPlugin as never)
    .use(sfcPlugin as never),
  renderRuleImage = md.renderer.rules.image,
  scriptOptions = { inlineTemplate },
  { transform } = transformerDirectives();

[comarkTaskList(), comarkEmoji(), math()].forEach(({ markdownItPlugins }) => {
  markdownItPlugins?.forEach((plugin) => md.use(plugin as never));
});

md.renderer.rules["math_inline"] = (tokens, idx) =>
  renderMath(tokens[idx]?.content ?? "", tokens[idx]?.meta?.display);
md.renderer.rules["math_block"] = (tokens, idx) =>
  renderMath(tokens[idx]?.content ?? "", true);
md.renderer.rules.image = (tokens, idx, options, env, self) => {
  const scale = parseFloat(
    (tokens.length === 1 ? tokens[idx]?.content : undefined) ?? "",
  );
  if (!isNaN(scale))
    tokens[idx]?.attrJoin("style", `zoom:${scale.toString()};`);
  tokens[idx]?.attrSet(
    "data-type",
    `image-${tokens.length <= 2 && tokens[0]?.type === "image" && ["mdc_inline_props", undefined].includes(tokens[1]?.type) ? "block" : "inline"}`,
  );
  return (
    renderRuleImage?.(tokens, idx, options, env, self) ??
    self.renderToken(tokens, idx, options)
  );
};

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
        `${
          sfcBlocks?.template && frontmatter["attrs"]
            ? `${sfcBlocks.template.tagOpen}<div${ssrRenderAttrs(frontmatter["attrs"] as Record<string, unknown>)}>${sfcBlocks.template.contentStripped}</div>${sfcBlocks.template.tagClose}`
            : (sfcBlocks?.template?.content ?? "")
        }
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
