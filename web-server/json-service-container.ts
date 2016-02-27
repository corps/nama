import { assignFromJson } from "../model-helpers/model-helpers";
import { User } from "../user-model/user-model";
import { UserStorage } from "../remote-storage/user-storage";
import * as express from "express";
import { ServerSession } from "./../sessions/session-model";
import  {Evernote} from "evernote";
import { ServiceHandler } from "./service-handler";
import { Security } from "./security";
import bodyParser = require("body-parser");
import * as Rx from "rx";
import {Logging, RequestError} from "./logging";
import onFinished = require("on-finished");

export class AuthorizationError extends Error {
}

export class JsonServiceContainer {
  services = express.Router();

  constructor(private userStorage:UserStorage,
              private logging:Logging,
              private security:Security) {
    this.services.use(this.security.xsrfProtection);
    this.services.use(bodyParser.json({limit: 1024 * 50}));
  }

  addServiceHandler(handler:ServiceHandler<any, any, User>) {
    this.services.post(handler.endpoint.subPath, this.createHandlerFor(handler));
  }

  private createHandlerFor(handler:ServiceHandler<any, any, User>) {
    return (req:express.Request, res:express.Response, next:Function) => {
      var request = new handler.endpoint.Request();
      if (!assignFromJson(request, req.body)) {
        res.status(400).send({error: true, requestInvalid: true});
        return;
      }

      var session = req.session as ServerSession;
      var userId = session.loggedInUserId;
      var foundUser$:Rx.Observable<User> = userId != null
        ? null
        : Rx.Observable.throw<User>(new Error("User was not logged in!"));

      var user$ = Rx.Observable.create<User>((observer) => {
        if (foundUser$ == null) {
          foundUser$ = this.userStorage.lookupUserById(userId);
        }

        foundUser$.catch((e) => {
          this.logging.errorsSubject.onNext(new RequestError(e, req))
          return Rx.Observable.throw(new AuthorizationError());
        }).subscribe(observer);
      });

      var response = new handler.endpoint.Response();

      var disposable = handler.handle(request, response, user$) .subscribe(
        () => {
        },
        (e) => {
          if (e.errorCode != null) {
            if ([Evernote.EDAMErrorCode['INVALID_AUTH'],
                Evernote.EDAMErrorCode['PERMISSION_DENIED'],
                Evernote.EDAMErrorCode['AUTH_EXPIRED']].indexOf(e.errorCode) != -1) {
              res.status(401).send({error: true, notAuthorized: true});
              return;
            } else {
              var badKey = Object.keys(Evernote.EDAMErrorCode)
                .filter((k:string) => (Evernote.EDAMErrorCode as any)[k] == e.errorCode)[0];
              e = new Error("Evernote error: " + badKey + " - " + e);
            }
          }

          if (e instanceof AuthorizationError) {
            res.status(401).send({error: true, notAuthorized: true});
            return;
          }

          next(e);
        }, () => {
          res.status(200).send(response);
        });

      onFinished(res, (err:any) => {
        disposable.dispose();
      });
    }
  }
}

