import type { HtmlTagDescriptor } from "vite";

import config from "@skaldapp/configs/vite";
import { readFileSync, writeFileSync } from "node:fs";
import { defineConfig, mergeConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

const crossorigin = true,
  dest = "assets",
  external = ["vue", "vue-router"],
  file = "",
  isStaticEntry = true,
  manifest = true,
  path = "./dist/.vite/manifest.json",
  targets = ["es-module-shims", ...external].map((name, i) => ({
    dest,
    file,
    name,
    rename(fileName: string, fileExtension: string) {
      if (targets[i]?.file)
        return `../../../${targets[i].file.split("/").pop() ?? targets[i].file}`;
      else {
        const { version } = JSON.parse(
          readFileSync(`node_modules/${name}/package.json`).toString(),
        ) as { version: string };
        const file = `${fileName}-${version}.${fileExtension}`;
        if (targets[i]) targets[i].file = `${targets[i].dest}/${file}`;
        return file;
      }
    },
    src: `node_modules/${name}/dist/${name}${i ? ".esm-browser.prod" : ""}.js`,
  }));

export default mergeConfig(
  config,
  defineConfig({
    build: {
      manifest,
      rolldownOptions: {
        external,
        output: {
          codeSplitting: {
            groups: [
              {
                name: "markdown",
                test: /node_modules\/markdown/,
              },
              {
                name: "sucrase",
                test: /node_modules\/sucrase/,
              },
              {
                name: "vue",
                test: /node_modules\/@vue/,
              },
              {
                name: "unocss",
                test: /node_modules\/@unocss/,
              },
              {
                name: "katex",
                test: /node_modules\/katex/,
              },
              {
                name: "esprima",
                test: /node_modules\/esprima/,
              },
              {
                name: "ofetch",
                test: /node_modules\/ofetch/,
              },
            ],
          },
        },
        transform: { inject: { Buffer: ["buffer", "Buffer"] } },
      },
    },
    plugins: [
      viteStaticCopy({ targets }),
      {
        closeBundle() {
          writeFileSync(
            path,
            JSON.stringify({
              ...JSON.parse(readFileSync(path).toString()),
              ...Object.fromEntries(
                targets.map(({ file, name, src }) => [
                  src,
                  { file, isStaticEntry, name },
                ]),
              ),
            }),
          );
        },
        name: "manifest",
      },
      {
        name: "html-transform",
        transformIndexHtml() {
          const [, ...vue] = targets,
            imports = Object.fromEntries(
              vue.map((target) => [
                target.name,
                `./assets/${target.rename(target.name + ".esm-browser.prod", "js")}`,
              ]),
            );
          return [
            {
              children: `navigator.userAgent.toLowerCase().includes("firefox")&&document.head.appendChild(Object.assign(document.createElement("script"),{src:"./assets/${targets[0]?.rename(targets[0].name, "js") ?? ""}"}))`,
              injectTo: "head-prepend",
              tag: "script",
            },
            {
              attrs: {
                as: "fetch",
                crossorigin,
                href: "./docs/index.json",
                rel: "preload",
              },
              injectTo: "head",
              tag: "link",
            },
            {
              attrs: { type: "importmap" },
              children: JSON.stringify({ imports }),
              injectTo: "head",
              tag: "script",
            },
            ...Object.values(imports).map(
              (href) =>
                ({
                  attrs: { crossorigin, href, rel: "modulepreload" },
                  injectTo: "head",
                  tag: "link",
                }) as HtmlTagDescriptor,
            ),
          ];
        },
      },
    ],
  }),
);
