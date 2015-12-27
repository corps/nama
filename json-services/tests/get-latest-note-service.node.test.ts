import * as Rx from "rx";
import * as QUnit from "qunitjs";
import {integrationModule, testObjects} from "../../integration-test-helpers/integration-test-helpers";
import {EvernoteClientRx} from "../../evernote-client-rx/evernote-client-rx";
import {GetLatestNoteService} from "../get-latest-note-service";
import {Evernote} from "evernote";
import {GetLatestNoteRequest} from "../../api/api-models";
import {GetLatestNoteResponse} from "../../api/api-models";

integrationModule("get-resource-service");

function wrapInsideEnNote(body:string) {
  return `<?xml version="1.0" encoding="utf-8"?><!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd"><en-note>${body}</en-note>`;
}

QUnit.test("Returns the latest note when the given version is less than the current version",
  (assert) => {
    var evernoteClient = new EvernoteClientRx(testObjects.testServer.config.evernoteConfig, undefined, true);
    var userClient = evernoteClient.forUser(testObjects.user);
    var service = new GetLatestNoteService(evernoteClient);

    var noteWithImage = new Evernote.Note();
    noteWithImage.content = wrapInsideEnNote("Some content");
    noteWithImage.title = "test";

    var request = new GetLatestNoteRequest();
    var response = new GetLatestNoteResponse();
    var noteId:string;
    var noteVersion:number;
    userClient.createNote(noteWithImage).flatMap((note:Evernote.Note) => {
      noteId = note.guid;
      noteVersion = note.updateSequenceNum;
      request.noteId = note.guid;
      request.noteVersion = -1;
      return service.handle(request, response, Rx.Observable.just(testObjects.user));
    }).ignoreElements().toArray().doOnNext(() => {
      assert.deepEqual(JSON.parse(JSON.stringify(response)), {
        "note": {
          "id": noteId,
          "text": "Some content",
          "sourceURL": "",
          "location": "",
          "terms": [],
          "version": noteVersion
        }, "wasUpToDate": false
      });
    }).catch((e) => {
      assert.ok(false, e + "");
      return Rx.Observable.empty();
    }).flatMap(() => {
      if (noteId) return userClient.deleteNote(noteId);
      return Rx.Observable.empty();
    }).finally(assert.async()).subscribe();
  });

QUnit.test("Returns wasUpToDate=true and does not fill out note when it is already up to date",
  (assert) => {
    var evernoteClient = new EvernoteClientRx(testObjects.testServer.config.evernoteConfig, undefined, true);
    var userClient = evernoteClient.forUser(testObjects.user);
    var service = new GetLatestNoteService(evernoteClient);

    var noteWithImage = new Evernote.Note();
    noteWithImage.content = wrapInsideEnNote("Some content");
    noteWithImage.title = "test";

    var request = new GetLatestNoteRequest();
    var response = new GetLatestNoteResponse();
    var noteId:string;
    var noteVersion:number;
    userClient.createNote(noteWithImage).flatMap((note:Evernote.Note) => {
      noteId = note.guid;
      noteVersion = note.updateSequenceNum;
      request.noteId = note.guid;
      request.noteVersion = noteVersion;
      return service.handle(request, response, Rx.Observable.just(testObjects.user));
    }).ignoreElements().toArray().doOnNext(() => {
      assert.deepEqual(JSON.parse(JSON.stringify(response)), {
        "note": {
          "id": "",
          "text": "",
          "sourceURL": "",
          "location": "",
          "terms": [],
          "version": 0
        }, "wasUpToDate": true
      });
    }).catch((e) => {
      assert.ok(false, e + "");
      return Rx.Observable.empty();
    }).flatMap(() => {
      if (noteId) return userClient.deleteNote(noteId);
      return Rx.Observable.empty();
    }).finally(assert.async()).subscribe();
  });
