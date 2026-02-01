import type { HtmlTagDescriptor } from "vite";

import inject from "@rollup/plugin-inject";
import config from "@skaldapp/configs/vite";
import UnoCSS from "@unocss/vite";
import { readFileSync, writeFileSync } from "node:fs";
import { defineConfig, mergeConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

const external = ["vue", "vue-router"],
  targets = ["es-module-shims", ...external].map((key, i) => ({
    dest: "assets",
    file: "",
    name: key,
    rename(fileName: string, fileExtension: string) {
      if (targets[i].file)
        return targets[i].file.split("/").pop() ?? targets[i].file;
      else {
        const { version } = JSON.parse(
          readFileSync(`node_modules/${key}/package.json`).toString(),
        ) as { version: string };
        const file = `${fileName}-${version}.${fileExtension}`;
        targets[i].file = `${targets[i].dest}/${file}`;
        return file;
      }
    },
    src: `node_modules/${key}/dist/${key}${i ? ".esm-browser.prod" : ""}.js`,
  }));

export default mergeConfig(
  config,
  defineConfig({
    build: {
      manifest: true,
      minify: "terser",
      rollupOptions: {
        external,
        output: {
          manualChunks(id) {
            const chunks = id.split("/"),
              index = -~chunks.indexOf("node_modules");
            chunks[0] = "";
            const [name] = chunks[index].replace(/^@/, "").split("-");
            return [
              "ajv",
              "css",
              "highlightjs",
              "katex",
              "markdown",
              "mdit",
              "ofetch",
              "sucrase",
              "unocss",
              "vue",
            ].includes(name)
              ? name
              : null;
          },
        },
        plugins: [inject({ Buffer: ["buffer", "Buffer"] })],
      },
    },
    plugins: [
      UnoCSS(),
      viteStaticCopy({ targets }),
      {
        closeBundle() {
          const path = "./dist/.vite/manifest.json";
          writeFileSync(
            path,
            JSON.stringify({
              ...JSON.parse(readFileSync(path).toString()),
              ...Object.fromEntries(
                targets.map(({ file, name, src }) => [
                  src,
                  { file, isStaticEntry: true, name },
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
                `./assets/${target.rename(`${target.name}.esm-browser.prod`, "js")}`,
              ]),
            );
          return [
            {
              children: `navigator.userAgent.toLowerCase().includes("firefox")&&document.head.appendChild(Object.assign(document.createElement("script"),{src:"./assets/${targets[0].rename(targets[0].name, "js")}"}))`,
              injectTo: "head-prepend",
              tag: "script",
            },
            {
              attrs: {
                as: "fetch",
                crossorigin: true,
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
                  attrs: { crossorigin: true, href, rel: "modulepreload" },
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
