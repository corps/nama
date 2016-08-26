import {User, OauthLogin} from "../user-model/user-model";
import {OAuthConfig}  from "../web-server/web-server-config";
import {Evernote} from "evernote";
import {tap} from "../utils/obj";
import * as Rx from "rx";
import * as crypto from "crypto";
import {IDisposable} from "rx";
import * as moment from "moment";

export interface EvernoteOauthResult {
  token: string,
  secret: string,
  results: any
}

interface EvernoteOauthClient {
  getAccessToken?(oauthToken: string, oauthTokenSecret: string, oauthVerifier: string,
                  cb: (err: any, oauthAccessToken: string, oauthAccessTokenSecret: string,
                       results: any)=>void): void

  getRequestToken?(callbackUrl: string,
                   cb: (err: any, oauthToken: string, oauthTokenSecret: string,
                        results: any)=>void): void
  getAuthorizeUrl?(oauthToken: string): string
}

export class EvernoteClientRx {
  constructor(private oauthConfig?: OAuthConfig,
              private userLogin?: OauthLogin, private isSandbox = true,
              private rateLimitCache = {} as {[k: string]: number}) {
    var config = {} as Evernote.ClientConfig;
    if (oauthConfig) {
      config.consumerKey = oauthConfig.consumerKey;
      config.consumerSecret = oauthConfig.consumerSecret;
      config.sandbox = isSandbox;
    }

    if (userLogin) {
      config.token = userLogin.token;
      config.secret = userLogin.secret;
    }

    this.evernoteClient = new Evernote.Client(config);
    this.oauthClient = this.evernoteClient as EvernoteOauthClient;

    if (userLogin) {
      this.userStore = this.evernoteClient.getUserStore();
      this.noteStore = this.evernoteClient.getNoteStore();
    }
  }

  private evernoteClient: Evernote.Client;
  private oauthClient: EvernoteOauthClient;
  private noteStore: Evernote.NoteStoreClient;
  private userStore: Evernote.UserStoreClient;

  forUser(user: User) {
    if (user.developerToken) {
      var login = new OauthLogin();
      login.token = user.developerToken;
      login.secret = undefined;
      var config = new OAuthConfig();
      config.consumerKey = undefined;
      config.consumerSecret = undefined;
      return new EvernoteClientRx(config, login, false, {});
    }

    return new EvernoteClientRx(this.oauthConfig, user.getEvernoteLogin(),
      this.isSandbox, this.rateLimitCache);
  }

  forLogin(userLogin: OauthLogin) {
    return new EvernoteClientRx(this.oauthConfig, userLogin,
      this.isSandbox, this.rateLimitCache);
  }

  getAccessToken(token: string, secret: string,
                 verifier: string): Rx.Observable<EvernoteOauthResult> {
    return Rx.Observable.create<EvernoteOauthResult>(observer => {
      this.oauthClient.getAccessToken(token, secret, verifier, (e, token, secret, results) => {
        if (e) return observer.onError(e);
        observer.onNext({token, secret, results});
        observer.onCompleted();
      })
    }).retry(3);
  }

  getRequestToken(callbackUrl: string): Rx.Observable<EvernoteOauthResult> {
    return Rx.Observable.create<EvernoteOauthResult>(observer => {
      this.oauthClient.getRequestToken(callbackUrl, (e, token, secret, results) => {
        if (e) return observer.onError(e);
        observer.onNext({token, secret, results});
        observer.onCompleted();
      })
    }).retry(3);
  }

  getAuthorizeUrl(token: string) {
    return this.oauthClient.getAuthorizeUrl(token);
  }

  getUserData() {
    return this.asObservable<Evernote.User>(this.userStore.getUser, this.userStore).retry(3);
  }

  listNotebooks() {
    return this.asObservable<Evernote.Notebook[]>(this.noteStore.listNotebooks, this.noteStore)
      .retry(3);
  }

  getSyncState() {
    return this.asObservable<Evernote.SyncState>(this.noteStore.getSyncState, this.noteStore)
      .retry(3);
  }

  createNotebook(notebook: Evernote.Notebook) {
    return this.asObservableWith1<Evernote.Notebook, Evernote.Notebook>(
      this.noteStore.createNotebook,
      notebook, this.noteStore);
  }

  updateNotebook(notebook: Evernote.Notebook) {
    return this.asObservableWith1<number, Evernote.Notebook>(this.noteStore.updateNotebook,
      notebook, this.noteStore);
  }

  getNotebook(guid: string) {
    return this.asObservableWith1<Evernote.Notebook, string>(this.noteStore.getNotebook,
      guid, this.noteStore);
  }

  getNote(guid: string, withContent = true, withResources = false) {
    return this.asObservableWith5<Evernote.Note, string, boolean, boolean, boolean, boolean>(
      this.noteStore.getNote, guid, withContent, withResources, false, false, this.noteStore);
  }

  listTagsByNotebook(guid: string) {
    return this.asObservableWith1<Evernote.Tag[], string>(this.noteStore.listTagsByNotebook, guid,
      this.noteStore);
  }

  listTags() {
    return this.asObservable<Evernote.Tag[]>(this.noteStore.listTags, this.noteStore);
  }

  deleteNotebook(guid: string) {
    return this.asObservableWith1<number, string>(this.noteStore.expungeNotebook,
      guid, this.noteStore);
  }

  createNote(note: Evernote.Note) {
    return this.asObservableWith1<Evernote.Note, Evernote.Note>(this.noteStore.createNote,
      note, this.noteStore);
  }

  createTag(tag: Evernote.Tag) {
    return this.asObservableWith1<Evernote.Tag, Evernote.Tag>(this.noteStore.createTag,
      tag, this.noteStore);
  }

  deleteTag(guid: string) {
    return this.asObservableWith1<number, string>(this.noteStore.expungeTag, guid, this.noteStore);
  }

  updateNote(note: Evernote.Note) {
    return this.asObservableWith1<Evernote.Note, Evernote.Note>(this.noteStore.updateNote,
      note, this.noteStore);
  }

  deleteNote(guid: string) {
    return this.asObservableWith1<number, string>(this.noteStore.deleteNote, guid, this.noteStore);
  }

  undeleteNote(guid: string) {
    return this.getNote(guid, false, false).flatMap((note) => {
      note.active = true;
      return this.updateNote(note);
    })
  }

  getResource(guid: string, withData = true) {
    return this.asObservableWith5<Evernote.Resource, string, boolean, boolean, boolean, boolean>(
      this.noteStore.getResource, guid, withData, false, false, false, this.noteStore);
  }

  addResourceToNote(note: Evernote.Note, data: Buffer, type: string) {
    var hash = crypto.createHash('md5').update(data).digest('hex');
    note.resources = [];
    note.resources.push(tap(new Evernote.Resource())((resource: Evernote.Resource) => {
      resource.mime = type;
      resource.data = new Evernote.Data();
      resource.data.body = data as any;
      resource.data.size = data.length;
      resource.data.bodyHash = hash;
    }));

    return `<en-media hash="${hash}" type="${type}"/>`;
  }

  expungeNote(guid: string) {
    return this.asObservableWith1<number, string>(this.noteStore.expungeNote, guid, this.noteStore);
  }

  sync(afterUsn: number, maxResults: number, filter: Evernote.SyncChunkFilter) {
    return this.asObservableWith3<Evernote.SyncChunk, number, number, Evernote.SyncChunkFilter>(
      this.noteStore.getFilteredSyncChunk, afterUsn, maxResults, filter, this.noteStore);
  }

  private asObservable<Result>(method: (cb: (e: any, r: Result)=>void)=>void,
                               ctx: any): Rx.Observable<Result> {
    return this.wrapWithRateLimiter(Rx.Observable.create<Result>(
      observer => method.call(ctx, this.getCallback(observer))));
  }

  private asObservableWith1<Result, P1>(method: (v: P1, cb: (e: any, r: Result)=>void)=>void,
                                        p1: P1,
                                        ctx: any): Rx.Observable<Result> {
    return this.wrapWithRateLimiter(Rx.Observable.create<Result>(
      observer => method.call(ctx, p1, this.getCallback(observer))));
  }

  private asObservableWith3<Result, P1, P2, P3>(method: (v: P1, v2: P2, v3: P3,
                                                         cb: (e: any, r: Result)=>void)=>void,
                                                p1: P1, p2: P2, p3: P3,
                                                ctx: any): Rx.Observable<Result> {
    return this.wrapWithRateLimiter(Rx.Observable.create<Result>(
      observer => method.call(ctx, p1, p2, p3, this.getCallback(observer))));
  }

  private asObservableWith5<Result, P1, P2, P3, P4, P5>(method: (v: P1, v2: P2, v3: P3, v4: P4,
                                                                 v5: P5,
                                                                 cb: (e: any,
                                                                      r: Result)=>void)=>void,
                                                        p1: P1, p2: P2, p3: P3, p4: P4, p5: P5,
                                                        ctx: any): Rx.Observable<Result> {
    return this.wrapWithRateLimiter(Rx.Observable.create<Result>(
      observer => method.call(ctx, p1, p2, p3, p4, p5, this.getCallback(observer))));
  }

  private getSecret(): string {
    return this.oauthConfig ? this.oauthConfig.consumerSecret : ""
  }

  private wrapWithRateLimiter<R>(observable: Rx.Observable<R>): Rx.Observable<R> {
    return Rx.Observable.create<any>((observer: Rx.Observer<any>) => {
      var secret = this.getSecret();
      var rateLimitedUntil = this.rateLimitCache[secret];
      console.log("checkin rate limit", rateLimitedUntil);

      if (rateLimitedUntil != null && Date.now() < rateLimitedUntil) {
        var from = moment(rateLimitedUntil).from(moment());
        console.error("Rate limited for " + from);
        var error = new Error("Rate limited for " + from);
        (error as any).rateLimitDuration = (rateLimitedUntil - Date.now()) / 1000;
        observer.onError(error);
        return;
      }

      observer.onCompleted();
    }).toArray().flatMap(() => observable);
  }

  private getCallback<R>(s: Rx.Observer<R>) {
    return (e: any, r: R) => {
      if (e) {
        console.error(e);
        if (e.rateLimitDuration) {
          this.rateLimitCache[this.getSecret()] = Date.now() + e.rateLimitDuration * 1000;
        }
        s.onError(e);
        return;
      }
      s.onNext(r);
      s.onCompleted();
    }
  }
}

