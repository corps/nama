import * as React from "react";
import * as ReactDOMServer from "react-dom/server";
import * as fs from "fs";
import * as path from "path";
import { CONTENT_ID as _CONTENT_ID } from "./content-id";

export interface HtmlPageProps {
  title?: string
  jsSrcPath?: string
  syncJsSrcPath?: string
  appleTouchIcon?: string
  description?: string
  children?: React.ReactNode[]
  sideLoadedData?: {[k:string]:any}
  inlineJs?: string,
  basePath?:string,
  manifest?:string,
}

export const CONTENT_ID = _CONTENT_ID;
export const DOCTYPE = "<!doctype html>";

export class HtmlHost extends React.Component<HtmlPageProps, any> {
  render() {
    var children:React.ReactChild = this.props.children == null ? null : React.Children.only(
      this.props.children);
    var contentHtml:string;

    if (typeof children == "string" || typeof children == "number") {
      contentHtml = children.toString();
    } else if (children != null) {
      contentHtml = ReactDOMServer.renderToString(children as React.ReactElement<any>);
    }

    return <html manifest={this.props.manifest}>
      <head>
        <meta httpEquiv="Content-Type" content="text/html; charset=UTF-8"/>
        <meta httpEquiv="x-ua-compatible" content="ie=edge"/>
        <meta name="viewport" content="width=device-width, initial-scale=1, user-scalable=no"/>
        { this.props.basePath
          ? <base href={this.props.basePath}/>
          : null }
        { this.props.jsSrcPath
          ? <script src={this.props.jsSrcPath} async></script>
          : null }
        { this.props.title ? <title>{ this.props.title }</title> : null }
        { this.props.description
          ? <meta name="description" content={this.props.description}/>
          : null }
        { this.props.appleTouchIcon
          ? <link rel="apple-touch-icon" href={this.props.appleTouchIcon}/>
          : null }
        { Object.keys(this.props.sideLoadedData || {}).map(k => <script
          dangerouslySetInnerHTML={{ __html: `window.${k} = ${JSON.stringify(this.props.sideLoadedData[k]) };` }}></script>) }
        { this.props.syncJsSrcPath
          ? <script src={this.props.syncJsSrcPath}></script>
          : null }
        { this.props.inlineJs
          ? <script dangerouslySetInnerHTML={{ __html: this.props.inlineJs }}></script>
          : null }
      </head>
      <body>
        <div id={CONTENT_ID} dangerouslySetInnerHTML={{ __html: contentHtml }}>
        </div>
      </body>
    </html>;
  }
}
