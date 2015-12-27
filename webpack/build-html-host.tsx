import * as React from "react";
import * as ReactDOMServer from "react-dom/server";
import * as fs from "fs";
import * as path from "path";
import {HtmlHost, HtmlPageProps, DOCTYPE} from "../html-host/html-host";
import {BaseConfiguration} from "./base-config";

export interface HtmlHostConfig {
  compiler: any,
  compilerConfig:BaseConfiguration,
  prerender:React.ReactChild,
  inlineBundleName?: string,
  props?: HtmlPageProps
}

export function renderHtmlHostForBundle(config:HtmlHostConfig):string {
  var compilerFs = config.compiler.outputFileSystem as typeof fs;
  if (compilerFs.readFileSync == null) {
    compilerFs.readFileSync = fs.readFileSync.bind(fs);
  }
  config.props = config.props || {};

  if (config.inlineBundleName) {
    let bundleOutPath = path.join(
      config.compilerConfig.output.path,
      config.inlineBundleName + ".js");
    config.props.inlineJs = compilerFs.readFileSync(bundleOutPath).toString();
  }

  return DOCTYPE + ReactDOMServer.renderToStaticMarkup(
      React.createElement(HtmlHost, config.props, config.prerender));
}