declare global {
  interface Window {
    __vue_app__: import("vue").App;
  }
  const __APP_VERSION__: string;
}
declare module "@traeblain/markdown-it-temml";
declare module "markdown-it-task-checkbox";
