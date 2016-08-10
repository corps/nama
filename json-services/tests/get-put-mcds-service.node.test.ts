import * as Rx from "rx";
import * as QUnit from "qunitjs";
import {integrationModule} from "../../integration-test-helpers/integration-test-helpers";
import {UserStorage} from "../../remote-storage/user-storage";
import {
  testObjects,
  testHandlerSync
} from "../../integration-test-helpers/integration-test-helpers";
import {MasterScheduleStorage} from "../../remote-storage/master-schedule-storage";
import {EvernoteClientRx} from "../../evernote-client-rx/evernote-client-rx";
import {EvernoteSyncService} from "../../evernote-mediators/evernote-sync-service";
import {MockedSyncService} from "../../evernote-mediators/tests/mocked-sync-service";
import {tap} from "../../utils/obj";
import {Evernote} from "evernote";
import {GetMcdsService} from "../get-mcds-service";
import {
  GetMcdsRequest, GetMcdsResponse, PutMcdsRequest,
  PutMcdsResponse
} from "../../api/api-models";
import {formatCloze} from "../../evernote-mediators/note-contents-mapper";
import {PutMcdsService} from "../put-mcds-service";
import {Note} from "../../study-model/note-model";

integrationModule("get-put-mcds-service");

function encloseInEnml(body:string) {
  return `<?xml version='1.0' encoding='utf-8'?>
<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">
<en-note style="margin:20px">${body}</en-note>`
}

QUnit.test(`
  thing
`, (assert) => {
  var userStorage = new UserStorage(testObjects.db);
  var scheduleStorage = new MasterScheduleStorage(testObjects.db);
  var evernoteClient = new EvernoteClientRx(testObjects.testServer.config.evernoteConfig, undefined, true);
  var userClient = evernoteClient.forUser(testObjects.user);
  var syncService = new MockedSyncService(userStorage, evernoteClient, scheduleStorage);
  var getService = new GetMcdsService(evernoteClient, scheduleStorage, syncService)
  var putService = new PutMcdsService(evernoteClient);
  var getRequest = new GetMcdsRequest();
  var getResponse = new GetMcdsResponse();
  var putRequest = new PutMcdsRequest();
  var putResponse = new PutMcdsResponse();
  var user$ = Rx.Observable.just(testObjects.user);

  putRequest.notes.push(tap(new Note())((note:Note) => {
  }));

  putService.handle(putRequest, putResponse, user$).doOnCompleted(() => {
    testHandlerSync(getRequest, getResponse, getService, "conents 1", "contents 2",
      assert, syncService, userClient, ({noteTwoGuid, noteOneGuid}) => {
        getRequest.ignoreIds = [noteTwoGuid];
        return putService.handle(putRequest, putResponse, user$)
          .doOnCompleted(() => {

          });
      },
      () => Rx.Observable.empty()
    ).doOnNext(() => {

    }).catch((e) => {
      assert.ok(false, e + "");
      return Rx.Observable.just(null);
    }).finally(assert.async()).subscribe();
  }).catch((e) => {
    assert.ok(false, e + "");
    return Rx.Observable.just(null);
  }).finally(assert.async()).subscribe();
});
