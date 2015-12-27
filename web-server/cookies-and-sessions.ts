import { WebServerConfig } from "./web-server-config";
import cookieParser = require("cookie-parser");
import session = require("express-session");
import { Cookies } from "./header-and-cookie-names";
import * as express from "express";

var FileStore = require('session-file-store')(session);

export class CookiesAndSessions {
  constructor(private config:WebServerConfig) {
  }

  cookieOptions = {
    secure: this.config.https,
    maxAge: this.config.sessionTtlSecs * 1000,
    path: '/',
  };

  sessionStore = this.config.isProduction
    ? new FileStore({ttl: this.config.sessionTtlSecs + 100, reapInterval: -1}) as session.Store
    : new session.MemoryStore();

  session = session({
    secret: this.config.secret,
    store: this.sessionStore,
    saveUninitialized: true,
    resave: false,
    rolling: false,
    unset: 'destroy',
    proxy: true,
    name: Cookies.SESSION_ID,
    cookie: this.cookieOptions
  });

  cookieParser = cookieParser(this.config.secret, this.cookieOptions);
}