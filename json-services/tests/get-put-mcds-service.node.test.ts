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
import {tap} from "../../utils/obj";
import {Evernote} from "evernote";
import {GetMcdsService} from "../get-mcds-service";
import {
  GetMcdsRequest, GetMcdsResponse, PutMcdsRequest,
  PutMcdsResponse
} from "../../api/api-models";
import {PutMcdsService} from "../put-mcds-service";
import {Note, Term, Cloze} from "../../study-model/note-model";

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
  var syncService = new EvernoteSyncService(userStorage, evernoteClient, scheduleStorage);
  var getService = new GetMcdsService(evernoteClient, scheduleStorage,
    syncService, testObjects.testServer.timeProvider());
  var putService = new PutMcdsService(evernoteClient, scheduleStorage);
  var getRequest = new GetMcdsRequest();
  var getResponse = new GetMcdsResponse();
  var putRequest = new PutMcdsRequest();
  var putResponse = new PutMcdsResponse();
  var user$ = Rx.Observable.just(testObjects.user);

  var note = new Note();
  putRequest.notes.push(note);

  var term = new Term();
  note.terms.push(term);

  note.text = "This would\n\nbe some note contents\n<For reference>."
  term.marker = "1";
  term.original = "original 1";
  term.details = "Some details would\ngo here\n\n\nand be <escaped> safely.";

  term = new Term();
  note.terms.push(term);

  term.marker = "2";
  term.original = "original 2";
  term.details = "Some more details here";
  term.hint = "hint here";

  var cloze = new Cloze();
  term.clozes.push(cloze);

  cloze.segment = "segment1";
  cloze.schedule.dueAtMinutes = 7483912;
  cloze.schedule.intervalMinutes = 38271;
  cloze.schedule.isNew = true;
  cloze.schedule.lastAnsweredMinutes = 5637114;

  cloze = new Cloze();
  term.clozes.push(cloze);

  cloze.schedule = null;
  cloze.segment = "segment2";

  var noteOneGuid = "";
  var noteTwoGuid = "";
  var noteOneVersion = 0;

  syncService.findOrCreateStudyBook(testObjects.user).flatMap(([guid, updateSequence]) => {
    testObjects.user.studyBook.guid = guid;
    testObjects.user.studyBook.syncVersion = updateSequence;

    return userClient.createNote(tap(new Evernote.Note)(note => {
      note.content = encloseInEnml("Content");
      note.notebookGuid = guid;
      note.title = "Test Note";
    })).doOnNext(note => {
      noteOneGuid = note.guid;
      noteOneVersion = note.updateSequenceNum;
    }).flatMap(() => {
      return userClient.createNote(tap(new Evernote.Note)(note => {
        note.content = encloseInEnml("Content");
        note.notebookGuid = guid;
        note.title = "Test Note";
      })).doOnNext(note => {
        noteTwoGuid = note.guid;
      });
    })
  }).flatMap(() => {
    getRequest.ignoreIds = [noteTwoGuid];
    note.id = noteOneGuid;

    return putService.handle(putRequest, putResponse, user$)
      .ignoreElements()
      .toArray()
      .doOnCompleted(() => {
        assert.deepEqual(putResponse.completedIds, [noteOneGuid]);
      }).doOnCompleted(assert.async());
  }).flatMap(() => {
    return getService.handle(getRequest, getResponse, user$).ignoreElements().toArray();
  }).doOnCompleted(() => {
    assert.equal(getResponse.notes.length, 1);

    var responseNote = getResponse.notes[0];
    assert.equal(responseNote.text, "This would\nbe some note contents\n<For reference>.");
    assert.equal(responseNote.id, note.id);
    assert.equal(responseNote.terms.length, 2);
    assert.ok(responseNote.version > noteOneVersion);

    assert.deepEqual(JSON.parse(JSON.stringify(responseNote.terms[0])), {
      "original": "original 1",
      "marker": "1",
      "details": "",
      "hint": "",
      "imageIds": [],
      "clozes": []
    });

    assert.deepEqual(JSON.parse(JSON.stringify(responseNote.terms[1])), {
      "original": "original 2",
      "marker": "2",
      "details": "",
      "hint": "hint here",
      "imageIds": [],
      "clozes": [{
        "segment": "segment1",
        "schedule": {
          "dueAtMinutes": 7483912,
          "lastAnsweredMinutes": 5637114,
          "intervalMinutes": 38271,
          "isNew": true
        }
      }, {
        "segment": "segment2",
        "schedule": {
          "dueAtMinutes": 420,
          "lastAnsweredMinutes": 0,
          "intervalMinutes": 0,
          "isNew": true
        }
      }]
    });

    assert.equal(responseNote.toString(),
      "This would\nbe some note contents\n<For reference>.\n\n[1] original 1\n\n[2] original 2\n? hint here\n-- segment1 new true due 03-25-1984 03:52 interval PT637H51M last 09-19-1980 15:54\n-- segment2 new true due 01-01-1970 07:00 interval P0D last 01-01-1970 00:00");
  }).catch((e) => {
    console.error(e);
    assert.ok(false, e + "");
    return Rx.Observable.just(null);
  }).finally(assert.async()).subscribe();
});
