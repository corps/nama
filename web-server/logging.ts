import { WebServerConfig } from "./web-server-config";
import * as express from "express";
import * as Rx from "rx";
import onFinished = require("on-finished");

export class RequestError {
  constructor(public error:any, public request:express.Request) {
    if (error == null) {
      throw new Error("Attempt to construct empty RequestError!");
    }
  }

  format() {
    return this.error + "";
    if (this.error.stack) {
      return this.error.stack;
    }
    return this.error;
  }

  toString() {
    return "ERROR on request " + this.request.url + ": " + this.format();
  }
}

export class Logging {
  constructor(private config:WebServerConfig,
              private timeProvider:()=>Date,
              lifecycle$:Rx.Observable<any>) {
    lifecycle$.finally(() => {
      this.errorsSubject.onCompleted();
      this.requestsSubject.onCompleted();
      this.responsesSubject.onCompleted();
    }).subscribe();
  }

  errorsSubject = new Rx.Subject<RequestError>();
  requestsSubject = new Rx.Subject<express.Request>();
  responsesSubject = new Rx.Subject<[Date, express.Response]>();

  requestAndResponseLogging =
    (req:express.Request, res:express.Response, next:Function) => {
      var received = this.timeProvider();
      this.requestsSubject.onNext(req);
      next();
      onFinished(res, (err:any) => {
        this.responsesSubject.onNext([received, res]);
        if (err) {
          this.errorsSubject.onNext(new RequestError(err, req));
        }
      });
    };

  errorLogging =
    (err:any, req:express.Request, res:express.Response, next:Function) => {
      this.errorsSubject.onNext(new RequestError(err, req));
      next(err);
    }
}
