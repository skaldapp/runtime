import type { App } from "vue";

declare global {
  interface Window {
    __vue_app__: App;
  }
}
