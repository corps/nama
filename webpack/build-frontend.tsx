require("lie/polyfill");
import * as React from "react";
import * as path from "path";
import {ProductionConfiguration} from "./production-config";
import {renderHtmlHostForBundle, HtmlHostConfig} from "./build-html-host";
import { HtmlPageProps } from "../html-host/html-host"
import { tap } from "../utils/obj";
import { Home, Assets } from "../api/endpoints";
import * as Rx from "rx";
import * as fs from "fs";

var webpack = require('webpack');
var config = new ProductionConfiguration();
var compiler = webpack(config);

var buildAssets = Rx.Observable.fromNodeCallback<any>(compiler.run, compiler);
console.log("Starting build...");

function fileSize(b:number) {
  var scale = Math.log(b) / Math.log(1024) | 0;
  return (b / Math.pow(1024, scale)).toFixed(2)
    + ' ' + (scale ? 'KMGTPEZY'[scale - 1] + 'iB' : 'Bytes');
}

buildAssets().flatMap((stats) => {
  if (stats.hasErrors()) {
    throw new Error(stats.toJson().errors.join("\n"));
  }

  stats = stats.toJson();

  console.log("Bundle complete");
  for (var asset of stats.assets) {
    console.log(asset.name, "-", fileSize(asset.size));
  }

  console.log("\n");
  stats.modules.sort((a:any, b:any) => {
    return b.size - a.size;
  });

  for (var module of stats.modules) {
    if (module.size < 1024 * 5) {
      break;
    }
    console.log(module.name, fileSize(module.size));
  }

  var indexHtml = renderHtmlHostForBundle(tap({} as HtmlHostConfig)((c:HtmlHostConfig) => {
    c.inlineBundleName = "inline";
    c.compiler = compiler;
    c.compilerConfig = config;
    c.prerender = require("../frontend-main/frontend-main-bundle").prerender;
    c.props = tap({} as HtmlPageProps)((p:HtmlPageProps) => {
      p.jsSrcPath = Assets.path + "frontend-main.js";
      p.title = "BenSRS";
      p.manifest = Assets.path + "app.appcache";
      p.basePath = Home.path;
    })
  }));

  var compilerFs = compiler.outputFileSystem as typeof fs;
  var outputPath = path.join(config.output.path, "index.html");
  var writeFs = Rx.Observable.fromNodeCallback<void, string, string>(compilerFs.writeFile);
  return writeFs(outputPath, indexHtml);
}).subscribe(() => {
  console.log("Build completed");
}, (e) => {
  console.error(e.stack || e + "")
});

