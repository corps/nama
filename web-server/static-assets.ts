import * as express from "express";
import { WebServerConfig } from "./web-server-config";
import compression = require("compression");
import * as path from "path";

const buildDir = path.join(__dirname, "../webpack/build");

export class StaticAssets {
  assets = express.Router();

  constructor(private config:WebServerConfig) {
    this.assets.use(compression());
    if (!this.config.useCache) {
      this.assets.use((req, res, next) => {
        if (req.url.indexOf("app.appcache") != -1) {
          res.send("CACHE MANIFEST\n# " + Math.random() + "\nNETWORK:\n *")
        } else {
          next();
        }
      });
    }
    this.assets.use(express.static(buildDir, {
      index: false,
      redirect: false
    }));
  }

  homePageCatchAll = (req:express.Request, res:express.Response, next:Function) => {
    if (req.accepts(['text/html', 'json']) == 'json') return next();
    req.url = "/index.html";
    this.assets(req, res, next);
  };
}
