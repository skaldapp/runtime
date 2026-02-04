import type { MarkdownItEnv } from "@mdit-vue/types";
import type { UnocssPluginContext, UnoGenerator } from "@unocss/core";
import type { RuntimeContext } from "@unocss/runtime";

import hljs from "@highlightjs/cdn-assets/es/highlight";
import { componentPlugin } from "@mdit-vue/plugin-component";
import { frontmatterPlugin } from "@mdit-vue/plugin-frontmatter";
import { sfcPlugin } from "@mdit-vue/plugin-sfc";
import { tocPlugin } from "@mdit-vue/plugin-toc";
import { abbr } from "@mdit/plugin-abbr";
import { dl } from "@mdit/plugin-dl";
import { figure } from "@mdit/plugin-figure";
import { footnote } from "@mdit/plugin-footnote";
import { imgLazyload } from "@mdit/plugin-img-lazyload";
import { imgMark } from "@mdit/plugin-img-mark";
import { imgSize } from "@mdit/plugin-img-size";
import { ins } from "@mdit/plugin-ins";
import { katex } from "@mdit/plugin-katex";
import { mark } from "@mdit/plugin-mark";
import { spoiler } from "@mdit/plugin-spoiler";
import { sub } from "@mdit/plugin-sub";
import { sup } from "@mdit/plugin-sup";
import { tasklist } from "@mdit/plugin-tasklist";
import { ElementTransform } from "@nolebase/markdown-it-element-transform";
import presets from "@skaldapp/configs/uno/presets";
import loadModule from "@skaldapp/loader-sfc";
import initUnocssRuntime from "@unocss/runtime";
import transformerDirectives from "@unocss/transformer-directives";
import { useFetch } from "@vueuse/core";
import MagicString from "magic-string";
import MarkdownIt from "markdown-it";
import anchor from "markdown-it-anchor";
import { full } from "markdown-it-emoji";
import pluginMdc from "markdown-it-mdc";
import twemoji from "twemoji";
import { defineAsyncComponent } from "vue";
import { ssrRenderAttrs } from "vue/server-renderer";

let transformNextLinkCloseToken = false,
  unoGenerator: null | UnoGenerator = null;

const display = "inline-block",
  extraProperties = { display },
  html = true,
  iconsOptions = { extraProperties },
  linkify = true,
  typographer = true,
  md: MarkdownIt = MarkdownIt({
    highlight: (code, language) =>
      `<pre><code class="hljs">${
        (language && hljs.getLanguage(language)
          ? hljs.highlight(code, { language }).value
          : md.utils.escapeHtml(code)) as string
      }</code></pre>`,
    html,
    linkify,
    typographer,
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
    .use(dl)
    .use(figure)
    .use(footnote)
    .use(imgLazyload)
    .use(imgMark)
    .use(imgSize)
    .use(ins)
    .use(katex)
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
  ready = ({ uno }: RuntimeContext) => {
    unoGenerator = uno;
  },
  { transform } = transformerDirectives();

void initUnocssRuntime({
  defaults: { presets: presets({ iconsOptions }) },
  ready,
});

md.renderer.rules["emoji"] = (tokens, idx) =>
  tokens[idx] ? twemoji.parse(tokens[idx].content) : "";

export default (id: string) =>
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
          unoGenerator &&
          transform(contentStripped, id, {
            uno: unoGenerator,
          } as UnocssPluginContext),
      ),
    );

    return loadModule(
      `${
        sfcBlocks?.template
          ? frontmatter["attrs"]
            ? `${sfcBlocks.template.tagOpen}<div${ssrRenderAttrs(frontmatter["attrs"] as Record<string, unknown>)}>${sfcBlocks.template.contentStripped}</div>${sfcBlocks.template.tagClose}`
            : sfcBlocks.template.content
          : ""
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
      { scriptOptions: { inlineTemplate: true } },
    );
  });
