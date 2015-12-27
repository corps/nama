import * as QUnit from "qunitjs";
import * as Rx from "rx";
import { DebugDatabaseRx } from "../database-rx/debug-database-rx";
import { Migrator } from "../remote-storage/migrator";
import { User, OauthLogin } from "../user-model/user-model";
import { tap } from "../utils/obj";
import { WebServerConfig, OAuthConfig } from "../web-server/web-server-config";
import {WebServer} from "../web-server/web-server";
import {ServiceHandler} from "../web-server/service-handler";
import request = require("request");
import * as http from "http";
import * as express from "express";
import {ErrorPages} from "../web-server/error-pages";
import * as fs from "fs";
import * as path from "path";
import { assignFromJson } from "../model-helpers/model-helpers";
import {Security} from "../web-server/security";
import {UserStorage} from "../remote-storage/user-storage";
import {CookiesAndSessions} from "../web-server/cookies-and-sessions";
import {MasterScheduleStorage} from "../remote-storage/master-schedule-storage";
import {EvernoteClientRx} from "../evernote-client-rx/evernote-client-rx";
import {MockedSyncService} from "../evernote-mediators/tests/mocked-sync-service";
import {Evernote} from "evernote";
import {Assert} from "qunitjs";
import {sync} from "glob";

var testConfig = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "test-config.json"), "utf8"));

export var testObjects = {} as {
  db:DebugDatabaseRx,
  user: User,
  testServer:TestServer,
  testClient:WebClient,
};

export class TestServer extends WebServer {
  curTime = new Date(18000000);
  timeProvider = () => () => this.curTime;
  testRouter = express.Router();
  errorPages:()=>ErrorPages;
  jsonServiceHandlers:()=>ServiceHandler<any, any, User>[];
  security:()=>Security;
  userStorage:()=>UserStorage;
  cookiesAndSessions:()=>CookiesAndSessions

  configureEndpoints() {
    this.app.use(this.testRouter);
    super.configureEndpoints();
  }

  getBaseUrl() {
    return "http://localhost:" + this.config.port;
  }
}

export class WebClient {
  constructor(private config:WebServerConfig) {
  }

  request(path:string, body?:any, headers?:{[k:string]:string}, method = "GET", isJson = false) {
    var url = "http://localhost:" + this.config.port + path;
    return Rx.Observable.create<[http.IncomingMessage, any]>(observer => {
      request({
          url: url, body: body, headers: headers,
          method: method, json: isJson, jar: this.jar
        },
        (err, response, body) => {
          if (err) return observer.onError(response);
          observer.onNext([response, body]);
          observer.onCompleted();
        })
    });
  }

  jsonRequest(path:string, body?:any, headers?:{[k:string]:string}, method = "POST") {
    return this.request(path, body, headers, method, true);
  }

  jar = request.jar();
}

function encloseInEnml(body:string) {
  return `<?xml version='1.0' encoding='utf-8'?>
<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">
<en-note style="margin:20px">${body}</en-note>`
}

interface HandlerSetupDetails {
  tagName?:string
  tagGuid?:string
  noteOneGuid?:string
  noteTwoGuid?:string
  noteOneVersion?:number
  noteTwoVersion?:number
}

export function testHandlerSync<Req, Res>(req:Req, res:Res,
                                          handler:ServiceHandler<Req, Res, User>,
                                          noteOneContents:string, noteTwoContents:string,
                                          assert:Assert,
                                          syncService:MockedSyncService,
                                          userClient:EvernoteClientRx,
                                          setupRequest:(setupDetails:HandlerSetupDetails)=>Rx.Observable<any>,
                                          setupData:(setupDetails:HandlerSetupDetails)=>Rx.Observable<any>):Rx.Observable<string[]> {
  var setup = {} as HandlerSetupDetails;
  return syncService.findOrCreateStudyBook(testObjects.user).flatMap(([guid, _]) => {
    testObjects.user.studyBook.guid = guid;
    return userClient.createTag(tap(new Evernote.Tag())(tag => {
      tag.name = setup.tagName = "realtag" + Math.random();
    })).flatMap((tag) => {
      setup.tagGuid = tag.guid;
      return userClient.createNote(tap(new Evernote.Note)(note => {
        note.tagGuids = [setup.tagGuid];
        note.content = encloseInEnml(noteOneContents);
        note.notebookGuid = guid;
        note.title = "Test Note";
      })).doOnNext(note => {
        setup.noteOneGuid = note.guid;
        setup.noteOneVersion = note.updateSequenceNum;
      });
    }).flatMap(() => {
      return userClient.createNote(tap(new Evernote.Note)(note => {
        note.tagGuids = [setup.tagGuid];
        note.content = encloseInEnml(noteTwoContents);
        note.notebookGuid = guid;
        note.title = "Test Note";
      })).doOnNext(note => {
        setup.noteTwoGuid = note.guid;
        setup.noteTwoVersion = note.updateSequenceNum;
      });
    })
  }).flatMap(() => {
    return setupRequest(setup).toArray();
  }).flatMap(() => {
    return Rx.Observable.merge<string>([
      handler.handle(req, res, Rx.Observable.just(testObjects.user)).toArray().map(() => "handler"),
      Rx.Observable.create<string>(observer => {
        observer.onNext("observer");
        setupData(setup).toArray().subscribe(() => {
        }, (e) => {
          observer.onError(e);
        }, () => {
          assert.equal(syncService.innerSyncs.length, 1);
          observer.onNext("inner");
          syncService.innerSyncs[0].onNext("ignore me");
          syncService.innerSyncs[0].onCompleted();
          observer.onCompleted();
        })
      }).delaySubscription(100)
    ]).toArray();
  }).catch(e => {
    return performCleanup().flatMap(Rx.Observable.throw(e));
  }).flatMap(events => {
    assert.deepEqual(events, ["observer", "inner", "handler"]);
    return performCleanup();
  });

  function performCleanup() {
    return Rx.Observable.merge(tap([] as Rx.Observable<any>[])(cleanup => {
      if (setup.noteOneGuid) {
        cleanup.push(userClient.deleteNote(setup.noteOneGuid));
      }
      if (setup.noteTwoGuid) {
        cleanup.push(userClient.deleteNote(setup.noteTwoGuid));
      }
      if (setup.tagGuid) cleanup.push(userClient.deleteTag(setup.tagGuid));
    })).toArray();
  }
}

export function integrationModule(name:string) {
  QUnit.module(name, {
    beforeEach: (assert) => {
      testObjects.user = new User();
      var serverConfig = tap(new WebServerConfig())(c => {
        assignFromJson(c, testConfig);
      });
      testObjects.testClient = new WebClient(serverConfig);

      DebugDatabaseRx.open(':memory:').flatMap(db => {
        testObjects.db = db;
        testObjects.testServer = new TestServer(serverConfig, db);
        return new Migrator(db).runAll();
      }).flatMap(() => {
        return testObjects.db.run("INSERT INTO users DEFAULT VALUES", []);
      }).flatMap((rowChanges) => {
        testObjects.user.id = rowChanges.lastID;
        testObjects.user.logins.push(tap(new OauthLogin())(l => {
          l.provider = "evernote";
          l.token = tryEnvSetting("EVERNOTE_TOKEN");
          l.secret = "";
          l.externalId = tryEnvSetting("EVERNOTE_USER_ID");
        }));
        return testObjects.db.run(
          "INSERT INTO oauthLogins (userId, provider, token, secret, externalId) " +
          "VALUES (?, ?, ?, ?, ?)",
          [testObjects.user.id, testObjects.user.logins[0].provider,
            testObjects.user.logins[0].token, testObjects.user.logins[0].secret,
            testObjects.user.logins[0].externalId])
      }).flatMap(() => {
        // TODO: lookup study book
        testObjects.user.studyBook.guid = "some-guid";
        return testObjects.db.run("INSERT INTO studyBooks (userId, guid) VALUES (?, ?)",
          [testObjects.user.id, testObjects.user.studyBook.guid]);
      }).flatMap((rowChanges) => {
        testObjects.user.studyBook.id = rowChanges.lastID;
        return Rx.Observable.just(null);
      }).catch((e) => {
        assert.ok(false, e + "");
        return null;
      }).subscribeOnCompleted(assert.async());
    },
    afterEach: (assert) => {
      testObjects.db.close().catch((e:any) => {
        assert.ok(false, e + "");
        return Rx.Observable.just(null);
      }).doOnCompleted(():void => {
        delete testObjects.user;
        delete testObjects.db;
        delete testObjects.testServer;
        delete testObjects.testClient;
      }).subscribeOnCompleted(assert.async());
    }
  })
}

var warned = {} as any;
export function tryEnvSetting(k:string, defaultValue?:string) {
  if (defaultValue == null) defaultValue = "some-" + k;
  var envVal = process.env[k];
  if (envVal == null) {
    if (!warned[k]) {
      console.warn("In order to run integration tests, " + k + " should be set in the environment");
      warned[k] = true;
    }
    return defaultValue;
  }

  return envVal;
}
