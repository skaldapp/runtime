import config from "@skaldapp/configs/uno";
import presets from "@skaldapp/configs/uno/presets";
import { defineConfig } from "@unocss/vite";

export default defineConfig({ presets: presets(), ...config });
