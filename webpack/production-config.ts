import { BaseConfiguration } from "./base-config";
import * as webpack from "webpack";
import AppCachePlugin = require("appcache-webpack-plugin");
import { Home } from "../api/endpoints";

export class ProductionConfiguration extends BaseConfiguration {
  bail = true;
  watch = false;

  constructor() {
    super();

    this.addProductionBundles();
    this.addProductionPlugins();
  }

  addProductionBundles() {
    this.addBundle("inline-assets/inline-bundle.js");
    this.addBundle("inline-assets/inline-css-bundle.js");
    this.addBundle("frontend-main/frontend-main-bundle.js");
  }

  addProductionPlugins() {
    this.plugins.push(new webpack.optimize.UglifyJsPlugin());
    this.plugins.push(new AppCachePlugin({
      exclude: [/.*\.appcache/, /.*inline.*/],
      output: "app.appcache",
      fallback: [Home.path + " " + Home.path]
    }))
  }
}
