import { WebServerConfig } from "./web-server-config";
import * as express from "express";
import { ErrorPage } from "../pages/error-page-component";
import { HtmlHost, DOCTYPE } from "../html-host/html-host";
import RedBox = require("redbox-react");
import React = require("react");
import * as ReactDOMServer from "react-dom/server";
import * as endpoints from "../api/endpoints";

export class ErrorPages {
  constructor(public config:WebServerConfig) {
  }

  errorResponse = (err:any, req:express.Request, res:express.Response, next:Function) => {
    res.status(500);
    if (req.accepts(['text/html', 'json']) == 'json') {
      if (this.config.isProduction) {
        res.send({error: true});
      } else {
        res.send({error: true, stack: err.stack || err + ""});
      }
    } else {
      if (this.config.isProduction) {
        res.send(this.renderHtml(
          <HtmlHost title="Error loading!" jsSrcPath={endpoints.Assets.path + "inline-css.js"}>
            <ErrorPage failureKanji="誤操作" explanation="Something went unfortunately wrong!"/>
          </HtmlHost>
        ));
      } else {
        if (!(err instanceof Error)) {
          err = new Error(JSON.stringify(err));
        }
        res.send(this.renderHtml(
          <HtmlHost title="Development Error" jsSrcPath={endpoints.Assets.path + "inline-css.js"}>
            <RedBox error={err}/>
          </HtmlHost>));
      }
    }
  };

  missingResourceResponse = (req:express.Request, res:express.Response, next:Function) => {
    res.status(404);
    if (req.accepts(['text/html', 'json']) == 'json') {
      res.send({error: true, missingResource: true});
    } else {
      res.send(this.renderHtml(
        <HtmlHost title="Page missing!" jsSrcPath={endpoints.Assets.path + "inline-css.js"}>
          <ErrorPage failureKanji="未検出" explanation="Looks like that page doesn't exist!"/>
        </HtmlHost>
      ));
    }
  };

  private renderHtml(html:React.ReactElement<any>) {
    return DOCTYPE + ReactDOMServer.renderToStaticMarkup(html);
  }
}
