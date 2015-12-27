import * as QUnit from "qunitjs";
import {LocalStorage} from "../local-storage";
import {MemoryStorage} from "../local-storage";
import {logout} from "../../sessions/fronted-session";
import {LocalSettingsStorage} from "../local-settings-storage";
import {LocalStudyStorage} from "../local-study-storage";
import {login} from "../../sessions/fronted-session";
import {tap} from "../../utils/obj";
import {ClientSession} from "../../sessions/session-model";
import {ScheduleUpdate} from "../../api/api-models";
import * as Rx from "rx-lite";
import {GetLatestNoteResponse} from "../../api/api-models";
import {Note} from "../../study-model/note-model";
import {Resource} from "../../study-model/note-model";
import {GetResourceResponse} from "../../api/api-models";
import {UpdateScheduleResponse} from "../../api/api-models";
import {ScheduledClozeIdentifier} from "../../api/api-models";
import {FetchScheduleResponse} from "../../api/api-models";
import {Term} from "../../study-model/note-model";
import {Cloze} from "../../study-model/note-model";

QUnit.module("local-study-storage", {
  beforeEach: () => {
    memoryStorage.clear();
    login(tap(new ClientSession())(s => {
      s.loggedInUserId = 1084;
    }));
    localSettingsStorage.connect(new Rx.Subject<any>(), new Rx.Subject<any>());
    loggedOut = false;
    curTimeUnix = 1508;
  }
});

var loggedOut = false;
var curTimeUnix = 1508;
var timeProvider = () => new Date(curTimeUnix * 1000);
var memoryStorage = new MemoryStorage();
var localStorage = new LocalStorage(memoryStorage);
var logoutHandler = () => loggedOut = true;
var localSettingsStorage = new LocalSettingsStorage(localStorage, logoutHandler);
var studyStorage = new LocalStudyStorage(localStorage, localSettingsStorage, timeProvider);

QUnit.test(`
  1.  recordScheduleUpdate records values correctly.
  2.  getScheduleUpdates clears old versions and returns highest version results
  3.  logging out would cause the logoutHandler to be triggered and nothing saved.
  4.  getScheduleUpdates results are deserialized into objects.
  5.  recordScheduleUpdates clears all other versions of that scheduled cloze
`, (assert) => {
  var fetchResponse = new FetchScheduleResponse();
  fetchResponse.expires = curTimeUnix + 100;
  fetchResponse.notes.push(tap(new Note())((note:Note) => {
    note.id = "noteid";
    note.terms.push(tap(new Term())((term:Term) => {
      term.marker = "term";
      term.clozes.push(new Cloze());
    }));
    note.terms.push(tap(new Term())((term:Term) => {
      term.marker = "term2";
      term.clozes.push(new Cloze());
      term.clozes.push(new Cloze());
    }));
  }));

  fetchResponse.scheduled.push(
    tap(new ScheduledClozeIdentifier())((sci:ScheduledClozeIdentifier) => {
      sci.noteVersion = 3;
      sci.clozeIdentifier.noteId = "noteid";
      sci.clozeIdentifier.termMarker = "term";
      sci.clozeIdentifier.clozeIdx = 0;
    }));

  fetchResponse.scheduled.push(
    tap(new ScheduledClozeIdentifier())((sci:ScheduledClozeIdentifier) => {
      sci.noteVersion = 5;
      sci.clozeIdentifier.noteId = "noteid";
      sci.clozeIdentifier.termMarker = "term";
      sci.clozeIdentifier.clozeIdx = 0;
    }));

  fetchResponse.scheduled.push(
    tap(new ScheduledClozeIdentifier())((sci:ScheduledClozeIdentifier) => {
      sci.noteVersion = 2;
      sci.clozeIdentifier.noteId = "noteid";
      sci.clozeIdentifier.termMarker = "term2";
      sci.clozeIdentifier.clozeIdx = 1;
    }));

  studyStorage.storeFetchResponse(fetchResponse);
  assert.deepEqual(localStorage.keys(),
    [
      "localSettings",
      "sc,noteid;term;0,0-3,1608,0",
      "sc,noteid;term;0,0-5,1608,0",
      "sc,noteid;term2;1,0-2,1608,0",
      "no,noteid,0-0"
    ]);

  var scheduleUpdate = new ScheduleUpdate();
  scheduleUpdate.scheduledIdentifier.clozeIdentifier.noteId = "noteid";
  scheduleUpdate.scheduledIdentifier.clozeIdentifier.termMarker = "term";
  scheduleUpdate.scheduledIdentifier.clozeIdentifier.clozeIdx = 0;

  scheduleUpdate.schedule.dueAtMinutes = 1;
  scheduleUpdate.scheduledIdentifier.noteVersion = 111;
  studyStorage.recordScheduleUpdate(scheduleUpdate);

  scheduleUpdate.schedule.dueAtMinutes = 2;
  scheduleUpdate.scheduledIdentifier.noteVersion = 9;
  studyStorage.recordScheduleUpdate(scheduleUpdate);

  scheduleUpdate.scheduledIdentifier.clozeIdentifier.termMarker = "term2";
  scheduleUpdate.schedule.dueAtMinutes = 3;
  studyStorage.recordScheduleUpdate(scheduleUpdate);

  scheduleUpdate.scheduledIdentifier.clozeIdentifier.clozeIdx = 1;
  scheduleUpdate.schedule.dueAtMinutes = 4;
  studyStorage.recordScheduleUpdate(scheduleUpdate);

  scheduleUpdate.scheduledIdentifier.clozeIdentifier.noteId = "noteid2";
  scheduleUpdate.schedule.dueAtMinutes = 5;
  studyStorage.recordScheduleUpdate(scheduleUpdate);

  var updates = studyStorage.getScheduleUpdates();
  updates.sort((a, b) => a.schedule.dueAtMinutes - b.schedule.dueAtMinutes);
  updates.forEach(u => assert.equal(u.constructor, ScheduleUpdate));
  assert.deepEqual(JSON.parse(JSON.stringify(updates)),
    [
      {
        "schedule": {
          "dueAtMinutes": 1,
          "intervalMinutes": 0,
          "isNew": true,
          "lastAnsweredMinutes": 0
        },
        "scheduledIdentifier": {
          "clozeIdentifier": {
            "clozeIdx": 0,
            "noteId": "noteid",
            "termMarker": "term"
          },
          "noteVersion": 111
        }
      },
      {
        "schedule": {
          "dueAtMinutes": 3,
          "intervalMinutes": 0,
          "isNew": true,
          "lastAnsweredMinutes": 0
        },
        "scheduledIdentifier": {
          "clozeIdentifier": {
            "clozeIdx": 0,
            "noteId": "noteid",
            "termMarker": "term2"
          },
          "noteVersion": 9
        }
      },
      {
        "schedule": {
          "dueAtMinutes": 4,
          "intervalMinutes": 0,
          "isNew": true,
          "lastAnsweredMinutes": 0
        },
        "scheduledIdentifier": {
          "clozeIdentifier": {
            "clozeIdx": 1,
            "noteId": "noteid",
            "termMarker": "term2"
          },
          "noteVersion": 9
        }
      },
      {
        "schedule": {
          "dueAtMinutes": 5,
          "intervalMinutes": 0,
          "isNew": true,
          "lastAnsweredMinutes": 0
        },
        "scheduledIdentifier": {
          "clozeIdentifier": {
            "clozeIdx": 1,
            "noteId": "noteid2",
            "termMarker": "term2"
          },
          "noteVersion": 9
        }
      }
    ]);

  assert.deepEqual(localStorage.keys(), [
    "localSettings",
    "no,noteid,0-0",
    "su,noteid;term;0,2-111",
    "su,noteid;term2;0,0-9",
    "su,noteid;term2;1,0-9",
    "su,noteid2;term2;1,0-9"
  ]);

  assert.equal(loggedOut, false);

  localStorage.clear();
  logout();
  studyStorage.recordScheduleUpdate(scheduleUpdate);
  assert.deepEqual(localStorage.keys().sort(), []);
  assert.equal(loggedOut, true);
});

QUnit.test(`
  1.  storeNoteResponse stores the result correctly
  2.  getNote can fetch the storeNoteResponse, returning the highest version.
  3.  when wasUpToDate is set, nothing is stored.
  4.  Returns null when no note by the given id is found.
  5.  deserializes the result into the right constructor
  6.  writes nothing and logs out when not authenticated
`, (assert) => {
  var noteResponse = new GetLatestNoteResponse();
  noteResponse.wasUpToDate = false;
  noteResponse.note.id = "noteid";

  noteResponse.note.text = "note1";
  noteResponse.note.version = 9;
  studyStorage.storeNoteResponse(noteResponse);

  noteResponse.note.version = 111;
  noteResponse.note.text = "note2";
  studyStorage.storeNoteResponse(noteResponse);

  noteResponse.note.id = "noteid2";
  noteResponse.note.text = "note3";
  studyStorage.storeNoteResponse(noteResponse);

  assert.deepEqual(localStorage.keys().sort(), [
    "localSettings",
    "no,noteid,0-9",
    "no,noteid,2-111",
    "no,noteid2,2-111"
  ]);
  var gotNote = studyStorage.getNote("noteid");
  assert.equal(gotNote.constructor, Note);
  assert.deepEqual(JSON.parse(JSON.stringify(gotNote)), {
    "id": "noteid",
    "location": "",
    "sourceURL": "",
    "terms": [],
    "text": "note2",
    "version": 111
  });

  gotNote = studyStorage.getNote("noteid2");
  assert.deepEqual(JSON.parse(JSON.stringify(gotNote)), {
    "id": "noteid2",
    "location": "",
    "sourceURL": "",
    "terms": [],
    "text": "note3",
    "version": 111
  });

  assert.equal(studyStorage.getNote("note3"), null);
  assert.equal(studyStorage.getNote("a"), null);

  assert.equal(loggedOut, false);

  logout();
  localStorage.clear();
  studyStorage.storeNoteResponse(noteResponse);
  assert.deepEqual(localStorage.keys(), []);
  assert.equal(loggedOut, true);
});

QUnit.test(`
  1.   storeUpdateScheduleResponse will remove schedule updates that match its cloze id
  2.   but it will ignore those whose versions is greater or equal.
  3.   it will prune duplicate versions within the store consider only the highest version
  4.   triggers logout handler and does not delete anything if logged out.
`, (assert) => {
  var scheduleUpdate = new ScheduleUpdate();

  scheduleUpdate.scheduledIdentifier.clozeIdentifier.noteId = "note1";
  scheduleUpdate.scheduledIdentifier.clozeIdentifier.termMarker = "term";
  scheduleUpdate.scheduledIdentifier.noteVersion = 5;
  studyStorage.recordScheduleUpdate(scheduleUpdate);

  scheduleUpdate.scheduledIdentifier.noteVersion = 1239;
  studyStorage.recordScheduleUpdate(scheduleUpdate);

  scheduleUpdate.scheduledIdentifier.clozeIdentifier.termMarker = "term2";
  scheduleUpdate.scheduledIdentifier.noteVersion = 10;
  studyStorage.recordScheduleUpdate(scheduleUpdate);

  scheduleUpdate.scheduledIdentifier.noteVersion = 5;
  studyStorage.recordScheduleUpdate(scheduleUpdate);

  scheduleUpdate.scheduledIdentifier.clozeIdentifier.termMarker = "term";
  scheduleUpdate.scheduledIdentifier.clozeIdentifier.noteId = "note2";
  scheduleUpdate.scheduledIdentifier.noteVersion = 2;
  studyStorage.recordScheduleUpdate(scheduleUpdate);

  for (var i = 1; i < 4; ++i) {
    var resource = new Resource();
    resource.id = "resource" + i;
    resource.noteId = "note" + i;
    studyStorage.storeResourceResponse(
      tap(new GetResourceResponse())(response => response.compressedResource = resource));

    var note = new Note();
    note.id = "note" + i;
    note.version = 10000; // does not matter what version the note is, it will be pruned if not cloze references it.
    studyStorage.storeNoteResponse(tap(new GetLatestNoteResponse())(response => {
      response.wasUpToDate = false;
      response.note = note;
    }));
  }

  var updateScheduleResponse = new UpdateScheduleResponse();
  updateScheduleResponse.completed.push(
    tap(new ScheduledClozeIdentifier())((sci:ScheduledClozeIdentifier) => {
      sci.noteVersion = 1500;
      sci.clozeIdentifier.noteId = "note1";
      sci.clozeIdentifier.termMarker = "term";
    }));
  updateScheduleResponse.completed.push(
    tap(new ScheduledClozeIdentifier())((sci:ScheduledClozeIdentifier) => {
      sci.noteVersion = 6;
      sci.clozeIdentifier.noteId = "note1";
      sci.clozeIdentifier.termMarker = "term2";
    }));
  updateScheduleResponse.completed.push(
    tap(new ScheduledClozeIdentifier())((sci:ScheduledClozeIdentifier) => {
      sci.noteVersion = 30;
      sci.clozeIdentifier.noteId = "note2";
      sci.clozeIdentifier.termMarker = "term";
    }));
  studyStorage.storeUpdateScheduleResponse(updateScheduleResponse);

  assert.deepEqual(
    studyStorage.getScheduleUpdates().map(su => su.scheduledIdentifier.clozeIdentifier.toString()),
    ["note1;term2;0"]);
  assert.equal(loggedOut, false);

  logout();
  updateScheduleResponse = new UpdateScheduleResponse();
  updateScheduleResponse.completed.push(
    tap(new ScheduledClozeIdentifier())((sci:ScheduledClozeIdentifier) => {
      sci.noteVersion = 1500;
      sci.clozeIdentifier.noteId = "note1";
      sci.clozeIdentifier.termMarker = "term2";
    }));
  studyStorage.storeUpdateScheduleResponse(updateScheduleResponse);
  assert.equal(loggedOut, true);
  assert.deepEqual(
    studyStorage.getScheduleUpdates().map(su => su.scheduledIdentifier.clozeIdentifier.toString()),
    ["note1;term2;0"]);
});

QUnit.test(`
  1.  storeResourceResponse stores the result correctly
  2.  getResource can fetch the storeResourceResponse.
  3.  Returns null when no resource by the given id is found.
  4.  deserializes the result into the right constructor
  5.  writes nothing and logs out when not authenticated
`, (assert) => {
  var resourceResponse = new GetResourceResponse();
  resourceResponse.compressedResource.id = "resource1";
  resourceResponse.compressedResource.noteId = "note1";
  resourceResponse.compressedResource.b64Data = "old data";
  studyStorage.storeResourceResponse(resourceResponse);

  resourceResponse.compressedResource.b64Data = "overwritten data";
  studyStorage.storeResourceResponse(resourceResponse);

  resourceResponse.compressedResource.id = "resource2";
  resourceResponse.compressedResource.noteId = "note2";
  resourceResponse.compressedResource.b64Data = "newdata";
  studyStorage.storeResourceResponse(resourceResponse);

  assert.deepEqual(localStorage.keys().sort(), [
    "localSettings",
    "re,resource1,note1",
    "re,resource2,note2"
  ]);
  var gotResource = studyStorage.getResource("resource1");
  assert.equal(gotResource.constructor, Resource);
  assert.deepEqual(JSON.parse(JSON.stringify(gotResource)), {
    "b64Data": "overwritten data",
    "contentType": "",
    "height": 0,
    "id": "resource1",
    "noteId": "note1",
    "width": 0
  });

  gotResource = studyStorage.getResource("resource2");
  assert.deepEqual(JSON.parse(JSON.stringify(gotResource)), {
    "b64Data": "newdata",
    "contentType": "",
    "height": 0,
    "id": "resource2",
    "noteId": "note2",
    "width": 0
  });

  assert.equal(studyStorage.getResource("note3"), null);
  assert.equal(studyStorage.getResource("a"), null);

  assert.equal(loggedOut, false);

  logout();
  localStorage.clear();
  studyStorage.storeResourceResponse(resourceResponse);
  assert.deepEqual(localStorage.keys(), []);
  assert.equal(loggedOut, true);
});

QUnit.test(`
  1.  storeFetchResponse stores the notes in the response by their version
  2.  it prunes notes not used in the storage or the response entries
  3.  it prunes resources, too.
  4.  respects versions of notes and sci when writing.
  5.  getScheduled filters by expiration, and returns result in order of their due.
  6.  Clears and ignores schedules that no longer exist in their corresponding note.
`, (assert) => {

  // Storing some new notes and clozes to setup a state containing values already.
  var fetchResponse = new FetchScheduleResponse();
  fetchResponse.expires = curTimeUnix + 100;
  for (var i = 1; i < 3; ++i) {
    fetchResponse.notes.push(tap(new Note())((note:Note) => {
      note.version = 10;
      note.id = "note" + i;
      note.terms.push(tap(new Term())((term:Term) => {
        term.marker = "term1";
        term.clozes.push(tap(new Cloze())((cloze:Cloze) => {
          cloze.schedule.dueAtMinutes = 100 + i * 20;
        }));
        term.clozes.push(tap(new Cloze())((cloze:Cloze) => {
          cloze.schedule.dueAtMinutes = 200 + i * 20;
        }));
      }));
      note.terms.push(tap(new Term())((term:Term) => {
        term.marker = "term2";
        term.clozes.push(tap(new Cloze())((cloze:Cloze) => {
          cloze.schedule.dueAtMinutes = 300 + i * 20;
        }));
        term.clozes.push(tap(new Cloze())((cloze:Cloze) => {
          cloze.schedule.dueAtMinutes = 400 + i * 20;
        }));
      }))
    }));
  }

  fetchResponse.scheduled.push(
    tap(new ScheduledClozeIdentifier())((sci:ScheduledClozeIdentifier) => {
      sci.noteVersion = 3;
      sci.clozeIdentifier.noteId = "note1";
      sci.clozeIdentifier.termMarker = "term1";
      sci.clozeIdentifier.clozeIdx = 1;
    }));

  fetchResponse.scheduled.push(
    tap(new ScheduledClozeIdentifier())((sci:ScheduledClozeIdentifier) => {
      sci.noteVersion = 3;
      sci.clozeIdentifier.noteId = "note2";
      sci.clozeIdentifier.termMarker = "term1";
      sci.clozeIdentifier.clozeIdx = 1;
    }));

  fetchResponse.scheduled.push(
    tap(new ScheduledClozeIdentifier())((sci:ScheduledClozeIdentifier) => {
      sci.noteVersion = 3;
      sci.clozeIdentifier.noteId = "note2";
      sci.clozeIdentifier.termMarker = "term2";
      sci.clozeIdentifier.clozeIdx = 0;
    }));

  studyStorage.storeFetchResponse(fetchResponse);

  studyStorage.storeResourceResponse(
    tap(new GetResourceResponse())(
      response => response.compressedResource = tap(new Resource())((resource:Resource) => {
        resource.id = "resource1";
        resource.noteId = "note3";
      })));

  studyStorage.storeNoteResponse(
    tap(new GetLatestNoteResponse())((response:GetLatestNoteResponse) => {
      response.note.id = "note3";
    }));

  fetchResponse = new FetchScheduleResponse();
  fetchResponse.expires = curTimeUnix + 1;
  fetchResponse.notes.push(tap(new Note())((note:Note) => {
    note.version = 3; // this version is older than previously recorded note1
    note.id = "note1";
    note.terms.push(tap(new Term())((term:Term) => {
      term.marker = "term1";
      term.clozes.push(tap(new Cloze())((cloze:Cloze) => {
        cloze.schedule.dueAtMinutes = -1;
      }));
      term.clozes.push(tap(new Cloze())((cloze:Cloze) => {
        cloze.schedule.dueAtMinutes = -2;
      }));
    }));
  }));

  fetchResponse.notes.push(tap(new Note())((note:Note) => {
    note.version = 3013281; // this version is newer than previously recorded note1
    note.id = "note2";
    note.text = "New body!";
    note.terms.push(tap(new Term())((term:Term) => {
      term.marker = "term1";
      term.clozes.push(tap(new Cloze())((cloze:Cloze) => {
        cloze.schedule.dueAtMinutes = 781;
      }));
      // one of the clozes is dropped here, which is stored in the schedule
    }));
    note.terms.push(tap(new Term())((term:Term) => {
      term.marker = "term2";
      term.clozes.push(tap(new Cloze())((cloze:Cloze) => {
        cloze.schedule.dueAtMinutes = 2;
      }));
      term.clozes.push(tap(new Cloze())((cloze:Cloze) => {
        cloze.schedule.dueAtMinutes = 3;
      }));
    }))
  }));

  // This won't effect the result since its version will be pruned
  fetchResponse.scheduled.push(
    tap(new ScheduledClozeIdentifier())((sci:ScheduledClozeIdentifier) => {
      sci.noteVersion = 2;
      sci.clozeIdentifier.noteId = "note2";
      sci.clozeIdentifier.termMarker = "term2";
      sci.clozeIdentifier.clozeIdx = 0;
    }));

  // This entry will expire later.
  fetchResponse.scheduled.push(
    tap(new ScheduledClozeIdentifier())((sci:ScheduledClozeIdentifier) => {
      sci.noteVersion = 50;
      sci.clozeIdentifier.noteId = "note1";
      sci.clozeIdentifier.termMarker = "term1";
      sci.clozeIdentifier.clozeIdx = 0;
    }));

  studyStorage.storeFetchResponse(fetchResponse);

  assert.equal(studyStorage.getResource("resource1"), null);
  assert.equal(studyStorage.getNote("note3"), null);
  assert.notEqual(studyStorage.getNote("note2"), null);
  assert.notEqual(studyStorage.getNote("note1"), null);

  assert.deepEqual(localStorage.keys().sort(), [
    "localSettings",
    "no,note1,1-10",
    "no,note2,1-10",
    "no,note2,6-3013281",
    "sc,note1;term1;0,1-50,1509,-1",
    "sc,note1;term1;1,0-3,1608,220",
    "sc,note2;term1;1,0-3,1608,240",
    "sc,note2;term2;0,0-2,1509,2",
    "sc,note2;term2;0,0-3,1608,340"
  ]);

  var schedule = studyStorage.getSchedule();
  assert.deepEqual(Object.keys(schedule.notes), ["note1", "note2"]);

  assert.notEqual(schedule.notes["note1"], null);
  assert.deepEqual(schedule.notes["note1"], studyStorage.getNote("note1"));
  assert.equal(schedule.notes["note1"].version, 10);

  assert.notEqual(schedule.notes["note2"], null);
  assert.deepEqual(schedule.notes["note2"], studyStorage.getNote("note2"));
  assert.equal(schedule.notes["note2"].version, 3013281);

  assert.deepEqual(JSON.parse(JSON.stringify(schedule.scheduledClozes)), [
    {
      "clozeIdentifier": {
        "clozeIdx": 0,
        "noteId": "note1",
        "termMarker": "term1"
      },
      "noteVersion": 50
    },
    {
      "clozeIdentifier": {
        "clozeIdx": 1,
        "noteId": "note1",
        "termMarker": "term1"
      },
      "noteVersion": 3
    },
    {
      "clozeIdentifier": {
        "clozeIdx": 0,
        "noteId": "note2",
        "termMarker": "term2"
      },
      "noteVersion": 3
    }
  ]);

  assert.deepEqual(localStorage.keys().sort(), [
    "localSettings",
    "no,note1,1-10",
    "no,note2,1-10",
    "no,note2,6-3013281",
    "sc,note1;term1;0,1-50,1509,-1",
    "sc,note1;term1;1,0-3,1608,220",
    "sc,note2;term2;0,0-3,1608,340"
  ]);

  curTimeUnix += 10;

  schedule = studyStorage.getSchedule();
  assert.deepEqual(schedule.scheduledClozes.map(sc => sc.clozeIdentifier.toString()),
    ["note1;term1;1", "note2;term2;0"]);

  assert.deepEqual(localStorage.keys().sort(), [
    "localSettings",
    "no,note1,1-10",
    "no,note2,1-10",
    "no,note2,6-3013281",
    "sc,note1;term1;1,0-3,1608,220",
    "sc,note2;term2;0,0-3,1608,340"
  ]);
});