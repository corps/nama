import * as Rx from "rx";
import * as QUnit from "qunitjs";
import {integrationModule, testObjects} from "../../integration-test-helpers/integration-test-helpers";
import {EvernoteClientRx} from "../../evernote-client-rx/evernote-client-rx";
import {Evernote} from "evernote";
import {ImportMaterial} from "../../legacy-import/legacy-model";
import {ImportTerm} from "../../legacy-import/legacy-model";
import {ImportCloze} from "../../legacy-import/legacy-model";
import {exportToEvernote} from "../../legacy-import/legacy-evernote-export";
import {UserStorage} from "../../remote-storage/user-storage";
import {MasterScheduleStorage} from "../../remote-storage/master-schedule-storage";
import {EvernoteSyncService} from "../../evernote-mediators/evernote-sync-service";
import {UpdateScheduleService} from "../update-schedule-service";
import {UpdateScheduleRequest} from "../../api/api-models";
import {UpdateScheduleResponse} from "../../api/api-models";
import {ScheduleUpdate} from "../../api/api-models";
import {mapEvernoteToNote} from "../../evernote-mediators/map-evernote-to-note";

integrationModule("update-schedule-service");

QUnit.test("it works", (assert) => {
  var term = {} as ImportTerm;
  var cloze = {} as ImportCloze;

  var importMaterial = {} as ImportMaterial;

  importMaterial.content = "Awesome content";
  importMaterial.terms = [];
  term.answer_details = "Deets";
  term.clozes = [];
  term.marker = "marker1";
  term.term = "Awesome";
  cloze.cloze = "Awe";
  cloze.due_at = 10 * 60 * 1000;
  cloze.interval = 5 * 60 * 1000;
  cloze.last_answered = 20 * 60 * 1000;
  term.clozes.push(cloze);
  term.clozes.push(cloze);
  importMaterial.terms.push(term);

  var evernoteClient = new EvernoteClientRx(testObjects.testServer.config.evernoteConfig, undefined, true);
  var userStorage = new UserStorage(testObjects.db);
  var scheduleStorage = new MasterScheduleStorage(testObjects.db);
  var syncService = new EvernoteSyncService(userStorage, evernoteClient, scheduleStorage);
  var updateService = new UpdateScheduleService(evernoteClient, scheduleStorage);

  var req = new UpdateScheduleRequest();
  var res = new UpdateScheduleResponse();

  var noteIds = [] as string[];
  var versions = [] as number[];
  syncService.findOrCreateStudyBook(testObjects.user)
    .flatMap(([studyBookGuid, _]:[string, number]) => {
      testObjects.user.studyBook.guid = studyBookGuid;
      return exportToEvernote(importMaterial, evernoteClient, testObjects.user)
    }).flatMap((evernote) => {
      noteIds.push(evernote.guid);
      versions.push(evernote.updateSequenceNum);
      return exportToEvernote(importMaterial, evernoteClient, testObjects.user);
    })
    .flatMap((evernote) => {
      noteIds.push(evernote.guid);
      versions.push(evernote.updateSequenceNum);

      if (noteIds[0] > noteIds[1]) {
        noteIds.reverse();
        versions.reverse();
      }

      var update = new ScheduleUpdate();
      update.schedule.dueAtMinutes = 100;
      update.schedule.lastAnsweredMinutes = 21;
      update.scheduledIdentifier.clozeIdentifier.noteId = noteIds[0];
      update.scheduledIdentifier.clozeIdentifier.termMarker = "marker1";
      update.scheduledIdentifier.clozeIdentifier.clozeIdx = 0;
      req.schedules.push(update);

      update = new ScheduleUpdate();
      update.schedule.dueAtMinutes = 101;
      update.schedule.lastAnsweredMinutes = 21;
      update.scheduledIdentifier.clozeIdentifier.noteId = noteIds[0];
      update.scheduledIdentifier.clozeIdentifier.termMarker = "marker1";
      update.scheduledIdentifier.clozeIdentifier.clozeIdx = 1;
      req.schedules.push(update);

      // Won't get applied, but will be in "completed" result
      update = new ScheduleUpdate();
      update.schedule.dueAtMinutes = 102;
      update.schedule.lastAnsweredMinutes = 21;
      update.scheduledIdentifier.clozeIdentifier.noteId = noteIds[0];
      update.scheduledIdentifier.clozeIdentifier.termMarker = "marker1";
      update.scheduledIdentifier.clozeIdentifier.clozeIdx = 3;
      req.schedules.push(update);

      // Differe note, applies
      update = new ScheduleUpdate();
      update.schedule.dueAtMinutes = 103;
      update.schedule.lastAnsweredMinutes = 21;
      update.scheduledIdentifier.clozeIdentifier.noteId = noteIds[1];
      update.scheduledIdentifier.clozeIdentifier.termMarker = "marker1";
      update.scheduledIdentifier.clozeIdentifier.clozeIdx = 0;
      req.schedules.push(update);

      // Won't get applied, last answered too late
      update = new ScheduleUpdate();
      update.schedule.dueAtMinutes = 104;
      update.schedule.lastAnsweredMinutes = 4;
      update.scheduledIdentifier.clozeIdentifier.noteId = noteIds[1];
      update.scheduledIdentifier.clozeIdentifier.termMarker = "marker1";
      update.scheduledIdentifier.clozeIdentifier.clozeIdx = 1;
      req.schedules.push(update);

      // Will error on bad noteId
      update = new ScheduleUpdate();
      update.schedule.dueAtMinutes = 106;
      update.schedule.lastAnsweredMinutes = 21;
      update.scheduledIdentifier.clozeIdentifier.noteId = "zZNOTREALID";
      update.scheduledIdentifier.clozeIdentifier.termMarker = "marker1";
      update.scheduledIdentifier.clozeIdentifier.clozeIdx = 1;
      req.schedules.push(update);

      return updateService.handle(req, res, Rx.Observable.just(testObjects.user))
        .ignoreElements().toArray();
    }).flatMap(() => {
    res.completed.sort(
      (a, b) => a.clozeIdentifier.toString() < b.clozeIdentifier.toString() ? -1 : 1);

    assert.deepEqual(
      JSON.parse(JSON.stringify(res.completed.map(sci => sci.clozeIdentifier.toString()))),
      [`${noteIds[0]};marker1;0`, `${noteIds[0]};marker1;1`, `${noteIds[0]};marker1;3`,
        `${noteIds[1]};marker1;0`, `${noteIds[1]};marker1;1`, `zZNOTREALID;marker1;1`]);

    var userClient = evernoteClient.forUser(testObjects.user);
    return Rx.Observable.merge(
      userClient.getNote(noteIds[0]).doOnNext((evernote:Evernote.Note) => {
        var note = mapEvernoteToNote(evernote);
        assert.deepEqual(JSON.parse(JSON.stringify(note.terms)), [{
          "original": "Awesome",
          "marker": "marker1",
          "details": "Deets",
          "hint": "",
          "imageIds": [],
          "clozes": [{
            "segment": "Awe",
            "schedule": {
              "dueAtMinutes": 100,
              "lastAnsweredMinutes": 21,
              "intervalMinutes": 0,
              "isNew": true
            }
          }, {
            "segment": "Awe",
            "schedule": {
              "dueAtMinutes": 101,
              "lastAnsweredMinutes": 21,
              "intervalMinutes": 0,
              "isNew": true
            }
          }]
        }])
      }),
      userClient.getNote(noteIds[1]).doOnNext((evernote:Evernote.Note) => {
        var note = mapEvernoteToNote(evernote);
        assert.deepEqual(JSON.parse(JSON.stringify(note.terms)), [{
          "original": "Awesome",
          "marker": "marker1",
          "details": "Deets",
          "hint": "",
          "imageIds": [],
          "clozes": [{
            "segment": "Awe",
            "schedule": {
              "dueAtMinutes": 103,
              "lastAnsweredMinutes": 21,
              "intervalMinutes": 0,
              "isNew": true
            }
          }, {
            "segment": "Awe",
            "schedule": {
              "dueAtMinutes": 10,
              "lastAnsweredMinutes": 20,
              "intervalMinutes": 5,
              "isNew": false
            }
          }]
        }])
      })
    ).ignoreElements().toArray();
  }).catch((e) => {
    assert.ok(false, e + "");
    return Rx.Observable.empty();
  }).finally(assert.async()).subscribe();
});
