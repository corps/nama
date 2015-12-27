import * as Rx from "rx";
import * as QUnit from "qunitjs";
import {integrationModule} from "../../integration-test-helpers/integration-test-helpers";
import {UserStorage} from "../../remote-storage/user-storage";
import {testObjects, testHandlerSync} from "../../integration-test-helpers/integration-test-helpers";
import {MasterScheduleStorage} from "../../remote-storage/master-schedule-storage";
import {EvernoteClientRx} from "../../evernote-client-rx/evernote-client-rx";
import {EvernoteSyncService} from "../../evernote-mediators/evernote-sync-service";
import {MockedSyncService} from "../../evernote-mediators/tests/mocked-sync-service";
import {SummaryStatsService} from "../summary-stats-service";
import {tap} from "../../utils/obj";
import {Evernote} from "evernote";
import {SummaryStatsRequest} from "../../api/api-models";
import {SummaryStatsResponse} from "../../api/api-models";
import {ClozeIdentifier} from "../../study-model/note-model";
import {Schedule} from "../../study-model/schedule-model";
import moment = require("moment");

integrationModule("summary-stats-service");

QUnit.test(`
  awaits the sync service before producing results
  maps the incoming tags to guids
  returns num due
`, (assert) => {
  var userStorage = new UserStorage(testObjects.db);
  var scheduleStorage = new MasterScheduleStorage(testObjects.db);
  var evernoteClient = new EvernoteClientRx(testObjects.testServer.config.evernoteConfig, undefined, true);
  var userClient = evernoteClient.forUser(testObjects.user);
  var syncService = new MockedSyncService(userStorage, evernoteClient, scheduleStorage);
  var service = new SummaryStatsService(scheduleStorage, evernoteClient, syncService);
  var req = new SummaryStatsRequest();
  var res = new SummaryStatsResponse();

  testHandlerSync(req, res, service, "", "", assert, syncService, userClient,
    ({tagName}) => {
      req.studyFilters = ["notrealtagever", tagName];
      return Rx.Observable.empty();
    },
    ({tagGuid}) => Rx.Observable.merge(
      scheduleStorage.recordSchedule(testObjects.user, 1, tap(new ClozeIdentifier())(ci => {
        ci.noteId = "noteId1";
        ci.termMarker = "marker";
      }), [tagGuid], tap(new Schedule())(s => {
        s.dueAtMinutes = Math.floor(moment().add(5, "minutes").unix() / 60)
      })),
      scheduleStorage.recordSchedule(testObjects.user, 1, tap(new ClozeIdentifier())(ci => {
        ci.noteId = "noteId2";
        ci.termMarker = "marker";
      }), ["otherguid"], tap(new Schedule())(s => {
        s.dueAtMinutes = Math.floor(moment().add(5, "minutes").unix() / 60)
      }))
    ).toArray()
  ).doOnNext(() => {
    assert.equal(res.dueToday, 1);
  }).catch((e) => {
    assert.ok(false, e + "");
    return Rx.Observable.just(null);
  }).finally(assert.async()).subscribe();
});