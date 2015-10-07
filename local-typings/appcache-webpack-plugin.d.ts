declare module "appcache-webpack-plugin" {
  interface AppCachePluginOptions {
    cache?: string[],
    network?: string[],
    fallback?: string[],
    settings?: string[],
    exclude?: (string|RegExp)[],
    output?: string
  }

  class AppCachePlugin {
    constructor(options:AppCachePluginOptions);
  }

  export = AppCachePlugin
}