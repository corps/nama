import { WebServerConfig } from "./web-server-config";
import * as express from "express";
import { Evernote } from "evernote";
import { ServerSession, ClientSession } from "./../sessions/session-model";
import * as uuid from "node-uuid";
import { Cookies } from "./header-and-cookie-names";
import { CookiesAndSessions } from "./cookies-and-sessions";
import { Home } from "../api/endpoints";
import { UserStorage } from "../remote-storage/user-storage";
import { EvernoteClientRx } from "../evernote-client-rx/evernote-client-rx";
import {OauthLogin} from "../user-model/user-model";
import { RequestError, Logging } from "./logging";

export class Login {
  constructor(private config:WebServerConfig,
              private cookiesAndSessions:CookiesAndSessions,
              private logging:Logging,
              private userStorage:UserStorage,
              private evernoteClient:EvernoteClientRx) {
  }

  loginEvernote = (req:express.Request, res:express.Response, next:(e:any)=>void) => {
    var session = req.session as ServerSession;

    var verifier = req.query['oauth_verifier'];
    if (verifier) {
      var login = new OauthLogin();
      var clientSession = new ClientSession();

      login.provider = "evernote";

      this.evernoteClient
        .getAccessToken(session.oauthToken, session.oauthSecret, verifier)
        .flatMap(({ token, secret, results }) => {
          login.externalId = results.edam_userId;
          login.secret = secret;
          login.token = token;

          return this.userStorage.createOrUpdateUserForLogin(login)
        })
        .flatMap((userId) => {
          session.loggedInUserId = userId;
          session.sessionXsrfToken = uuid.v4().toString();
          var userClient = this.evernoteClient.forLogin(login);

          clientSession.loggedInUserId = userId;
          clientSession.sessionXsrfToken = session.sessionXsrfToken;

          return userClient.getUserData();
        })
        .subscribe((userData:Evernote.User) => {
          clientSession.userName = userData.username;
          res.cookie(Cookies.CLIENT_SESSION,
            JSON.stringify(clientSession),
            this.cookiesAndSessions.cookieOptions);
          res.redirect(Home.path);
        }, (e) => {
          if (e) this.logging.errorsSubject.onNext(new RequestError(e, req));
          this.logout(req, res);
        });
      session.oauthToken = "";
      session.oauthSecret = "";
    } else {
      this.evernoteClient.getRequestToken(this.getRequestUrl(req))
        .subscribe(({token, secret, results}) => {
          session.oauthToken = token;
          session.oauthSecret = secret;
          res.redirect(this.evernoteClient.getAuthorizeUrl(token));
        }, next);
    }
  };

  logout = (req:express.Request, res:express.Response) => {
    res.clearCookie(Cookies.CLIENT_SESSION, this.cookiesAndSessions.cookieOptions);
    req.session.destroy((e) => {
      if (e) this.logging.errorsSubject.onNext(new RequestError(e, req));
    });
    res.redirect(Home.path);
  };

  private getRequestUrl(req:express.Request) {
    var portPortion = this.config.behindProxy ? "" : ":" + this.config.port;
    return req.protocol + "://" + req.hostname + portPortion + req.originalUrl.replace(/\?.*/, "");
  }
}