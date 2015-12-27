import * as QUnit from "qunitjs";
import * as path from "path";
import * as fs from "fs";
import { Evernote } from "evernote";
import { ImportMaterial } from "../legacy-model";
import { exportToEvernote } from "../legacy-evernote-export";
import { User } from "../../user-model/user-model";
import { NoteStore } from "evernote-promisified-ts";
import { NoteContentsMapper } from "../../evernote-mediators/note-contents-mapper";
import * as Rx from "rx";
import {integrationModule, testObjects} from "../../integration-test-helpers/integration-test-helpers";
import {EvernoteClientRx} from "../../evernote-client-rx/evernote-client-rx";
import {EvernoteSyncService} from "../../evernote-mediators/evernote-sync-service";
import {UserStorage} from "../../remote-storage/user-storage";
import {MasterScheduleStorage} from "../../remote-storage/master-schedule-storage";
import {sync} from "glob";

function resolve<T>(val:T):Promise<T> {
  return new Promise<T>((resolve, reject) => {
    resolve(val);
  });
}

integrationModule("legacy-evernote-export");

QUnit.test("export to evernote", (assert) => {
  var material = JSON.parse(
    fs.readFileSync(path.join(__dirname, "single-multi-cloze.json")) + "") as ImportMaterial;

  var evernoteClient = new EvernoteClientRx(testObjects.testServer.config.evernoteConfig, undefined, true);
  var userStorage = new UserStorage(testObjects.db);
  var scheduleStorage = new MasterScheduleStorage(testObjects.db);
  var syncService = new EvernoteSyncService(userStorage, evernoteClient, scheduleStorage);

  syncService.findOrCreateStudyBook(testObjects.user).flatMap(([studyBookGuid, _]) => {
    testObjects.user.studyBook.guid = studyBookGuid;
    return exportToEvernote(material, evernoteClient, testObjects.user);
  }).toPromise()
    .then((foundNote) => {
      var mapper = new NoteContentsMapper(foundNote.content);
      mapper.map();

      assert.equal(mapper.note.text, material.content);
      assert.equal(mapper.note.terms.length, material.terms.length);

      mapper.note.terms.forEach((term, i) => {
        assert.equal(term.details,
          material.terms[i].answer_details.replace(/\s/g, " ").replace(/\s\s+/g, " "));

        assert.equal(term.clozes.length, material.terms[i].clozes.length);

        term.clozes.forEach((cloze, j) => {
          var expectedCloze = material.terms[i].clozes[j];
          assert.equal(cloze.segment, expectedCloze.cloze);
          assert.equal(cloze.schedule.dueAtMinutes,
            Math.floor(expectedCloze.due_at / 60000));
          assert.equal(cloze.schedule.intervalMinutes, Math.floor(expectedCloze.interval / 60000));
          assert.equal(cloze.schedule.lastAnsweredMinutes,
            Math.floor(expectedCloze.last_answered / 60000));
        })
      });
    }).then(undefined, (e) => {
    assert.ok(!e, e + "");
  }).then(assert.async());
});