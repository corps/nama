import { BaseConfiguration } from "./base-config";
import * as webpack from "webpack";
import * as glob from "glob";
import * as path from "path";

export class DevelopmentConfiguration extends BaseConfiguration {
  bail = false;
  watch = true;
  devtool = "eval";

  constructor() {
    super();

    this.addAllBundles();
    this.configHotReloaders();
  }

  addAllBundles() {
    glob.sync("*/*" + this.bundleExtension, {cwd: this.context, nodir: true})
      .forEach(path => this.addBundle(path));
  }

  configHotReloaders() {
    this.module.loaders.push(<any>{
      test: /-bundle\.js$/,
      loaders: ['react-hot'],
      exclude: /node_modules/
    });

    this.plugins.unshift(new webpack.HotModuleReplacementPlugin());

    for (var k in this.entries) {
      let entries = this.entries[k];
      entries.unshift('webpack/hot/only-dev-server', 'webpack-hot-middleware/client')
    }
  }
}

