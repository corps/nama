import { WebServerConfig } from "./web-server-config";
import * as express from "express";
import { ServerSession} from "./../sessions/session-model";
import { Headers } from "./header-and-cookie-names";
import * as endpoints from "../api/endpoints";

export class Security {
  constructor(private config:WebServerConfig) {
  }

  strictTransport = (req:express.Request, res:express.Response, next:Function) => {
    if (this.config.https) {
      res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
      if (req.header("x-forwarded-proto") != "https") {
        res.redirect("https://" + req.hostname + req.url);
        return;
      }
    }
    next();
  };

  xsrfProtection = (req:express.Request, res:express.Response, next:Function) => {
    var session = req.session as ServerSession;
    if (["POST", "PUT", "DELETE"].indexOf(req.method) == -1) return next();
    var xsrfInHeader = req.header(Headers.XSRF_TOKEN);
    if (!xsrfInHeader || xsrfInHeader != session.sessionXsrfToken) {
      if (req.is('json')) {
        res.status(401).send({error: true, xsrfFailure: true});
      } else {
        res.redirect(endpoints.Login.path);
      }
      return;
    }
    next();
  };
}
