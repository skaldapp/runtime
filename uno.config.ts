import type { PresetOrFactoryAwaitable } from "unocss";

import config from "@skaldapp/configs/uno";
import presets from "@skaldapp/configs/uno/presets";
import { defineConfig } from "unocss";

export default defineConfig({
  presets: presets() as PresetOrFactoryAwaitable[],
  ...config,
});
