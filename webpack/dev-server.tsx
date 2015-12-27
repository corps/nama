import * as React from "react";
import * as path from "path";
import {DevelopmentConfiguration} from "./development-config";
import express = require('express');
import {BundlesDirectoryComponent} from "./bundles-directory-component";
import {renderHtmlHostForBundle} from "./build-html-host";
import { RedboxErrors } from "../rebox-errors/redbox-errors-component";
import { WebpackErrorCatcherPlugin } from "./webpack-error-catcher-plugin";

require('lie/polyfill');
var webpackDevMiddleware = require('webpack-dev-middleware');
var webpackHotMiddleware = require('webpack-hot-middleware');
var webpack = require('webpack');

var config = new DevelopmentConfiguration();
var server = express();
var port = 8080;

var seenErrors:Error[] = [];
config.plugins.push(new WebpackErrorCatcherPlugin(
  (e) => seenErrors.push(e),
  () => seenErrors = []
));

var compiler = webpack(config);

server.use(webpackDevMiddleware(compiler, {
  publicPath: config.output.publicPath,
  noInfo: false,
  quiet: false,
  stats: {
    colors: true
  }
}));
server.use(webpackHotMiddleware(compiler));

const bundleNames = Object.keys(config.entries);
console.log(bundleNames);

server.get('/', (req, res) => {
  res.header("Content-Type", "text/html; charset=UTF-8");

  var bundlesHtml = renderHtmlHostForBundle({
    prerender: <BundlesDirectoryComponent bundleNames={bundleNames}/>,
    compiler: compiler,
    compilerConfig: config,
    inlineBundleName: "inline-css",
    props: {
      sideLoadedData: {bundleNames},
      jsSrcPath: "/assets/dev-server-frontend.js"
    }
  });

  res.send(bundlesHtml);
});

server.get(/^\/bundle\/(.+)/, (req, res) => {
  var bundleId = req.params[0];
  if (!(bundleId in config.entries)) {
    res.send(404);
    return;
  }

  var bundleEntries = config.entries[bundleId];
  var bundleMain = bundleEntries[bundleEntries.length - 1];

  var prerender = require(path.join(__dirname, "..", bundleMain)).prerender;

  var widgetHtml = renderHtmlHostForBundle({
    prerender: prerender as React.ReactChild,
    compiler: compiler,
    compilerConfig: config,
    inlineBundleName: "inline-css",
    props: {
      jsSrcPath: "/assets/" + bundleId + ".js"
    }
  });

  res.send(widgetHtml);
});

server.use(((err, req, res, next) => {
  if (!err) return next();

  res.status(err.status || 500);

  var allErrs = [err].concat(seenErrors);

  res.send(renderHtmlHostForBundle({
    prerender: <div>
      <RedboxErrors errors={allErrs}/>
    </div>,
    compiler: compiler,
    compilerConfig: config,
    props: {
      sideLoadedData: {
        errors: allErrs.map(e => {
          stack: e.stack
        })
      },
      jsSrcPath: "/assets/redbox-errors.js"
    }
  }));
}) as express.ErrorRequestHandler);

server.listen(port, (err:any) => {
  if (err) {
    console.error(err);
  } else {
    console.info(`Serving on http://localhost:${port}`);
  }
});
