import * as express from "express";
import { WebServerConfig } from "./web-server-config";
import * as http from "http";
import * as Rx from "rx";
import * as endpoints from "../api/endpoints";
import { ServerSession, ClientSession } from "./../sessions/session-model";
import * as headers from "./header-and-cookie-names";
import { CookiesAndSessions } from "./cookies-and-sessions";
import { Logging } from "./logging";
import { Security } from "./security";
import { ErrorPages } from "./error-pages";
import { StaticAssets } from "./static-assets";
import { JsonServiceContainer } from "./json-service-container";
import { DatabaseRx } from "../database-rx/database-rx";
import { UserStorage } from "../remote-storage/user-storage";
import { Login } from "./login";
import { EvernoteClientRx } from "../evernote-client-rx/evernote-client-rx";
import {ServiceHandler} from "./service-handler";
import {User} from "../user-model/user-model";
import {UpdateScheduleService} from "../json-services/update-schedule-service";
import {SummaryStatsService} from "../json-services/summary-stats-service";
import {MasterScheduleStorage} from "../remote-storage/master-schedule-storage";
import {EvernoteSyncService} from "../evernote-mediators/evernote-sync-service";
import {GetResourceService} from "../json-services/get-resource-service";
import {GetLatestNoteService} from "../json-services/get-latest-note-service";
import {FetchScheduleService} from "../json-services/fetch-schedule-service";

export enum Lifecycle { STARTING, UP, STOPPING, STOPPED }

function cached<T>(producer:()=>T):()=>T {
  var cached:T;
  var called = false;

  return () => {
    if (called) {
      return cached;
    }
    called = true;
    return cached = producer();
  }
}

export class WebServer {
  private started = false;
  private stopping = false;
  private lifecycleSubject = new Rx.Subject<Lifecycle>();

  protected userStorage = cached(() => new UserStorage(this.db));
  protected timeProvider = cached(() => () => new Date());
  protected cookiesAndSessions = cached(() => new CookiesAndSessions(this.config));
  protected logging = cached(() => new Logging(this.config, this.timeProvider(), this.lifecycle$));
  protected security = cached(() => new Security(this.config));
  protected errorPages = cached(() => new ErrorPages(this.config));
  protected staticAssets = cached(() => new StaticAssets(this.config));
  protected jsonServiceContainer = cached(() =>
    new JsonServiceContainer(this.userStorage(), this.logging(), this.security()));
  protected evernoteClient = cached(() =>
    new EvernoteClientRx(this.config.evernoteConfig, undefined, !this.config.isProduction));
  protected login = cached(() => new Login(
    this.config, this.cookiesAndSessions(), this.logging(),
    this.userStorage(), this.evernoteClient()));
  protected scheduleStorage = cached(() => new MasterScheduleStorage(this.db));
  protected syncService = cached(
    () => new EvernoteSyncService(this.userStorage(), this.evernoteClient(), this.scheduleStorage()));
  protected updateScheduleService = cached(
    () => new UpdateScheduleService(this.evernoteClient(), this.scheduleStorage()));
  protected summaryStatsService = cached(
    () => new SummaryStatsService(this.scheduleStorage(), this.evernoteClient(), this.syncService()));
  protected getResourceService = cached(() => new GetResourceService(this.evernoteClient()));
  protected getLatestNoteService = cached(() => new GetLatestNoteService(this.evernoteClient()));
  protected fetchScheduleService = cached(
    () => new FetchScheduleService(this.scheduleStorage(), this.evernoteClient(), this.syncService(), this.timeProvider()))
  protected jsonServiceHandlers = cached<ServiceHandler<any, any, User>[]>(() =>
    [
      this.fetchScheduleService(), this.getLatestNoteService(), this.getResourceService(),
      this.summaryStatsService(), this.updateScheduleService()
    ]);

  server:http.Server;
  app:express.Application = express();

  get lifecycle$() {
    return this.lifecycleSubject.asObservable();
  }

  get request$() {
    return this.logging().requestsSubject.asObservable()
  }

  get error$() {
    return this.logging().errorsSubject.asObservable();
  }

  get response$() {
    return this.logging().responsesSubject.asObservable();
  }

  constructor(public config:WebServerConfig,
              private db:DatabaseRx) {
  }

  start() {
    if (this.started) throw new Error("Server had already started!");
    this.started = true;

    this.configure();

    this.lifecycleSubject.onNext(Lifecycle.STARTING);
    try {
      this.server = this.app.listen(this.config.port, () => {
        this.lifecycleSubject.onNext(Lifecycle.UP);
      });
    } catch (e) {
      this.beginShutdown(cb => {
        cb(e);
      });
      throw e;
    }
    return this.lifecycle$;
  }

  close() {
    this.beginShutdown(cb => {
      this.server.close(cb);
    });
    return this.lifecycle$;
  }

  private beginShutdown(handler:(cb:(e:any)=>void)=>void) {
    if (this.stopping) return;
    this.stopping = true;
    this.lifecycleSubject.onNext(Lifecycle.STOPPING);
    handler((e) => {
      if (e != null) return this.lifecycleSubject.onError(e);
      this.lifecycleSubject.onNext(Lifecycle.STOPPED);
      this.lifecycleSubject.onCompleted();
    });
  }

  private configure() {
    this.app.disable('x-powered-by');
    this.app.enable('trust proxy');
    this.configureMiddleware();
    this.addJsonServices();
  }

  protected addJsonServices() {
    this.jsonServiceHandlers().forEach(s => {
      this.jsonServiceContainer().addServiceHandler(s);
    });
  }

  protected configureEndpoints() {
    this.app.get(endpoints.Login.path, this.login().loginEvernote);
    this.app.get(endpoints.Logout.path, this.login().logout);
    this.app.use(endpoints.Api.path, this.jsonServiceContainer().services);
    this.app.get(endpoints.Home.path, this.staticAssets().homePageCatchAll);
  }

  private configureMiddleware() {
    this.app.use(this.logging().requestAndResponseLogging);
    this.app.use(this.security().strictTransport);

    this.app.use(endpoints.Assets.path, this.staticAssets().assets);

    this.app.use(this.cookiesAndSessions().cookieParser);
    this.app.use(this.cookiesAndSessions().session);

    this.configureEndpoints();

    this.app.use(this.errorPages().missingResourceResponse);
    this.app.use(this.logging().errorLogging);
    this.app.use(this.errorPages().errorResponse);
  }
}