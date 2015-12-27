import * as webpack from "webpack";
import * as path from "path";
import { Assets } from "../api/endpoints";

interface WebpackDevServer {
  contentBase?: string
}

interface Resolve {
  extensions?: string[]
  alias?: {[k:string]:string}
}

export interface Configuration extends webpack.Configuration {
  bail?: boolean // iff true the webpack process will exit with code 1 when the build has errors
  profile?: boolean // iff true outputs information relating to time and size of build pieces.
  watch?: boolean // iff true continues to build while watching the file system.
  devtool?: string // see webpack docs, wraps output js for easier development navigation
  resolve?: Resolve // details for package resolution
  devServer?: WebpackDevServer // configuration for the devServer
  context?: string // base directory
}

export class BaseConfiguration implements Configuration {
  context = path.join(__dirname, "..");
  output = {
    path: path.join(this.context, "webpack", "build"),
    filename: "[name].js",
    publicPath: Assets.path,
  };
  resolve = {
    alias: {
      "rx": "rx-lite",
      "rx-heavy": "rx"
    } as {[k:string]:string}
  };
  plugins = [new webpack.NoErrorsPlugin()];

  cssLoaderQuery = "localIdentName=[local]";
  module = {
    loaders: [
      {test: /\.css$/, loader: 'style-loader!css-loader?' + this.cssLoaderQuery},
    ] as webpack.Loader[]
  };

  profile = true;
  stats = true;
  entries = {} as {[k:string]:string[]};

  // alias to match webpack configuration
  get entry() {
    return this.entries;
  }

  bundleExtension = "-bundle.js";

  addBundle(bundlePath:string):string[] {
    let fileName = path.basename(bundlePath);
    let bundleName = fileName.substring(0, fileName.length - this.bundleExtension.length);

    if (this.entries[bundleName]) {
      throw new Error(`Attempted to create bundle ${bundleName} with ${bundlePath}, but that bundle already exists`);
    }

    return this.entries[bundleName] = ["./" + bundlePath];
  }
}
