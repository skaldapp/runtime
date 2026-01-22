import type { HtmlTagDescriptor } from "vite";

import inject from "@rollup/plugin-inject";
import config from "@skaldapp/configs/vite";
import UnoCSS from "@unocss/vite";
import { readFileSync, writeFileSync } from "node:fs";
import { defineConfig, mergeConfig } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";

const external = ["vue", "vue-router", "@skaldapp/loader-sfc"],
  targets = external.map((key, i) => ({
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
    src: `node_modules/${key}/dist/${
      key.split("/").pop() ?? key
    }.esm-browser.prod.js`,
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
              "markdown",
              "mdit",
              "ofetch",
              "unocss",
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
        name: "importmap",
        transformIndexHtml() {
          const imports = Object.fromEntries(
            targets.map((target) => [
              target.name,
              `./assets/${target.rename(
                `${target.name.split("/").pop() ?? target.name}.esm-browser.prod`,
                "js",
              )}`,
            ]),
          );
          return [
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
