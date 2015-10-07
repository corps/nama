import * as Rx from "rx";
import * as QUnit from "qunitjs";
import {integrationModule} from "../../integration-test-helpers/integration-test-helpers";
import {UserStorage} from "../../remote-storage/user-storage";
import {testObjects, testHandlerSync} from "../../integration-test-helpers/integration-test-helpers";
import {MasterScheduleStorage} from "../../remote-storage/master-schedule-storage";
import {EvernoteClientRx} from "../../evernote-client-rx/evernote-client-rx";
import {EvernoteSyncService} from "../../evernote-mediators/evernote-sync-service";
import {MockedSyncService} from "../../evernote-mediators/tests/mocked-sync-service";
import {tap} from "../../utils/obj";
import {Evernote} from "evernote";
import {ClozeIdentifier} from "../../study-model/note-model";
import {Schedule} from "../../study-model/schedule-model";
import moment = require("moment");
import {FetchScheduleService} from "../fetch-schedule-service";
import {FetchScheduleRequest} from "../../api/api-models";
import {FetchScheduleResponse} from "../../api/api-models";

integrationModule("fetch-schedule-service");

QUnit.test(`
  1.  Waits for sync before processing results
  2.  Looks up the tags represented by the the strings and filters the schedule by it
  3.  leases the results
  4.  returns the notes corresponding to that schedule, deduping clozes from the same note.
  5.  Uses the note version of the schedule storage, not the note itself, for the returned clozes
  6.  notes are in order of their guids
  7.  scheduled are in order of their cloze identifier
`, (assert) => {

  var timeUnix = 481923;
  var timeProvider = () => new Date(timeUnix * 1000 + 1);
  var userStorage = new UserStorage(testObjects.db);
  var scheduleStorage = new MasterScheduleStorage(testObjects.db);
  var evernoteClient = new EvernoteClientRx(testObjects.testServer.config.evernoteConfig, undefined, true);
  var userClient = evernoteClient.forUser(testObjects.user);
  var syncService = new MockedSyncService(userStorage, evernoteClient, scheduleStorage);
  var service = new FetchScheduleService(scheduleStorage, evernoteClient, syncService, timeProvider)
  var req = new FetchScheduleRequest();
  var res = new FetchScheduleResponse();

  var noteGuids = [] as string[];
  var noteVersions = [] as number[];
  testHandlerSync(req, res, service, "contents 1", "contents 2", assert, syncService, userClient,
    ({tagName}) => {
      req.studyFilters = ["notrealtagever", tagName];
      req.requestedNum = 100;
      return Rx.Observable.empty();
    },
    ({noteOneGuid, noteTwoGuid, noteOneVersion, noteTwoVersion, tagGuid}) => {
      noteGuids.push(noteOneGuid);
      noteGuids.push(noteTwoGuid);
      noteVersions.push(noteOneVersion);
      noteVersions.push(noteTwoVersion);
      return Rx.Observable.merge(
        scheduleStorage.recordSchedule(testObjects.user, 1, tap(new ClozeIdentifier())(ci => {
          ci.noteId = noteOneGuid;
          ci.termMarker = "marker";
        }), [tagGuid], tap(new Schedule())(s => {
          s.dueAtMinutes = 10;
        })),
        scheduleStorage.recordSchedule(testObjects.user, 1, tap(new ClozeIdentifier())(ci => {
          ci.noteId = noteTwoGuid;
          ci.termMarker = "marker1";
        }), [tagGuid], tap(new Schedule())(s => {
          s.dueAtMinutes = 200;
        })),
        scheduleStorage.recordSchedule(testObjects.user, 1, tap(new ClozeIdentifier())(ci => {
          ci.noteId = noteTwoGuid;
          ci.termMarker = "marker2";
        }), [tagGuid], tap(new Schedule())(s => {
          s.dueAtMinutes = 200;
        })),
        scheduleStorage.recordSchedule(testObjects.user, 1, tap(new ClozeIdentifier())(ci => {
          ci.noteId = noteTwoGuid;
          ci.termMarker = "marker3";
        }), ["notTheTag"], tap(new Schedule())(s => {
          s.dueAtMinutes = 300;
        }))
      ).toArray()
    }
  ).doOnNext(() => {
    var scheduled:any;

    var noteStrings = ["contents 1", "contents 2"];
    if (noteGuids[0] > noteGuids[1]) {
      scheduled = [{
        "clozeIdentifier": {
          "noteId": noteGuids[1],
          "termMarker": "marker1",
          "clozeIdx": 0
        }, "noteVersion": 1
      }, {
        "clozeIdentifier": {
          "noteId": noteGuids[1],
          "termMarker": "marker2",
          "clozeIdx": 0
        }, "noteVersion": 1
      }, {
        "clozeIdentifier": {
          "noteId": noteGuids[0],
          "termMarker": "marker",
          "clozeIdx": 0
        }, "noteVersion": 1
      }];

      noteGuids.reverse();
      noteVersions.reverse();
      noteStrings.reverse();
    } else {
      scheduled = [{
        "clozeIdentifier": {
          "noteId": noteGuids[0],
          "termMarker": "marker",
          "clozeIdx": 0
        }, "noteVersion": 1
      }, {
        "clozeIdentifier": {
          "noteId": noteGuids[1],
          "termMarker": "marker1",
          "clozeIdx": 0
        }, "noteVersion": 1
      }, {
        "clozeIdentifier": {
          "noteId": noteGuids[1],
          "termMarker": "marker2",
          "clozeIdx": 0
        }, "noteVersion": 1
      }]
    }

    assert.deepEqual(JSON.parse(JSON.stringify(res)), {
      "notes": [{
        "id": noteGuids[0],
        "text": noteStrings[0],
        "sourceURL": "",
        "location": "",
        "terms": [],
        "version": noteVersions[0],
      }, {
        "id": noteGuids[1],
        "text": noteStrings[1],
        "sourceURL": "",
        "location": "",
        "terms": [],
        "version": noteVersions[1],
      }],
      "scheduled": scheduled,
      "expires": 525123
    });
  }).catch((e) => {
    assert.ok(false, e + "");
    return Rx.Observable.just(null);
  }).finally(assert.async()).subscribe();
});
