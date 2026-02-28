import type { MarkdownItEnv } from "@mdit-vue/types";
import type { UnocssPluginContext, UnoGenerator } from "@unocss/core";

import comark from "@comark/markdown-it";
import { componentPlugin } from "@mdit-vue/plugin-component";
import { frontmatterPlugin } from "@mdit-vue/plugin-frontmatter";
import { sfcPlugin } from "@mdit-vue/plugin-sfc";
import { tocPlugin } from "@mdit-vue/plugin-toc";
import { ElementTransform } from "@nolebase/markdown-it-element-transform";
import slugify from "@sindresorhus/slugify";
import loadModule from "@skaldapp/loader-sfc";
import temml from "@traeblain/markdown-it-temml";
import transformerDirectives from "@unocss/transformer-directives";
import { useFetch } from "@vueuse/core";
import { toHtml } from "hast-util-to-html";
import MagicString from "magic-string";
import MarkdownIt from "markdown-it";
import anchor from "markdown-it-anchor";
import { full as emoji } from "markdown-it-emoji";
import MarkdownItCheckbox from "markdown-it-task-checkbox";
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
    .use(anchor, { slugify })
    .use(emoji)
    .use(MarkdownItCheckbox)
    .use(comark)
    .use(temml)
    .use(frontmatterPlugin)
    .use(tocPlugin, { linkTag })
    .use(componentPlugin)
    .use(sfcPlugin),
  renderRuleImage = md.renderer.rules.image,
  scriptOptions = { inlineTemplate },
  { transform } = transformerDirectives();

md.renderer.rules.image = (tokens, idx, options, env, self) => {
  if (tokens.length === 1) {
    const scale = parseFloat(tokens[idx]?.content ?? "");
    if (!isNaN(scale))
      tokens[idx]?.attrJoin("style", `zoom:${scale.toString()};`);
    return self.renderToken(tokens, idx, options);
  } else
    return `<span>${renderRuleImage?.(tokens, idx, options, env, self) ?? self.renderToken(tokens, idx, options)}</span>`;
};

md.core.ruler.before(
  "github-task-lists",
  "clean-mdc-before-task-list",
  ({ tokens }) => {
    tokens.forEach(({ children, type }, index, array) => {
      if (
        type === "inline" &&
        children &&
        children[0]?.type === "mdc_inline_span" &&
        children[2]?.type === "mdc_inline_span" &&
        [" ", "x", "X"].includes(children[1]?.content ?? "") &&
        (array[index - 1]?.type === "list_item_open" ||
          (array[index - 1]?.type === "paragraph_open" &&
            array[index - 2]?.type === "list_item_open"))
      ) {
        children.splice(2, 1);
        children.splice(0, 1);
      }
    });
  },
);

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
