import type { HtmlTagDescriptor } from "vite";

import inject from "@rollup/plugin-inject";
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
  minify = "terser",
  path = "./dist/.vite/manifest.json",
  targets = ["es-module-shims", ...external].map((name, i) => ({
    dest,
    file,
    name,
    rename(fileName: string, fileExtension: string) {
      if (targets[i].file)
        return targets[i].file.split("/").pop() ?? targets[i].file;
      else {
        const { version } = JSON.parse(
          readFileSync(`node_modules/${name}/package.json`).toString(),
        ) as { version: string };
        const file = `${fileName}-${version}.${fileExtension}`;
        targets[i].file = `${targets[i].dest}/${file}`;
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
      minify,
      rollupOptions: {
        external,
        output: {
          manualChunks(id) {
            const chunks = id.split("/"),
              index = -~chunks.indexOf("node_modules");
            chunks[0] = "";
            const [name] = chunks[index].replace(/^@/, "").split("-");
            return [
              "markdown",
              "ofetch",
              "sucrase",
              "traeblain",
              "unocss",
              "vscode",
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
              children: `navigator.userAgent.toLowerCase().includes("firefox")&&document.head.appendChild(Object.assign(document.createElement("script"),{src:"./assets/${targets[0].rename(targets[0].name, "js")}"}))`,
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
