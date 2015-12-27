import * as Rx from "rx";
import * as QUnit from "qunitjs";
import {integrationModule, testObjects} from "../../integration-test-helpers/integration-test-helpers";
import {GetResourceService} from "../get-resource-service";
import {EvernoteClientRx} from "../../evernote-client-rx/evernote-client-rx";
import {Evernote} from "evernote";
import * as fs from "fs";
import {GetResourceRequest} from "../../api/api-models";
import {GetResourceResponse} from "../../api/api-models";

integrationModule("get-resource-service");

function wrapInsideEnNote(body:string) {
  return `<?xml version="1.0" encoding="utf-8"?><!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd"><en-note>${body}</en-note>`;
}

QUnit.test("returns scaled and compressed resources", (assert) => {
  var evernoteClient = new EvernoteClientRx(testObjects.testServer.config.evernoteConfig, undefined, true);
  var userClient = evernoteClient.forUser(testObjects.user);
  var service = new GetResourceService(evernoteClient, 1024 * 250, 200);

  var noteWithImage = new Evernote.Note();
  var resourceTag = userClient.addResourceToNote(noteWithImage,
    fs.readFileSync(__dirname + "/bubble.jpg"),
    "image/jpeg");

  noteWithImage.content = wrapInsideEnNote(resourceTag);
  noteWithImage.title = "test";

  var request = new GetResourceRequest();
  var response = new GetResourceResponse();
  var noteId:string;
  userClient.createNote(noteWithImage).flatMap((note:Evernote.Note) => {
    noteId = note.guid;
    request.resourceId = note.resources[0].guid;
    return service.handle(request, response, Rx.Observable.just(testObjects.user));
  }).ignoreElements().toArray().doOnNext(() => {
    assert.equal(response.compressedResource.width, 200);
    assert.equal(response.compressedResource.height, 149);
    assert.ok(response.compressedResource.b64Data.length > 10);
    assert.equal(response.compressedResource.id, request.resourceId);
    assert.equal(response.compressedResource.noteId, noteId);
    assert.equal(response.compressedResource.contentType, "image/jpeg");
    fs.writeFileSync(__dirname + "/bubble.out.jpg", response.compressedResource.b64Data, "base64");
  }).catch((e) => {
    assert.ok(false, e + "");
    return Rx.Observable.empty();
  }).flatMap(() => {
    if (noteId) return userClient.deleteNote(noteId);
    return Rx.Observable.empty();
  }).finally(assert.async()).subscribe();
});

QUnit.test("returns an empty result if the result is too big", (assert) => {
  var evernoteClient = new EvernoteClientRx(testObjects.testServer.config.evernoteConfig, undefined, true);
  var userClient = evernoteClient.forUser(testObjects.user);
  var service = new GetResourceService(evernoteClient, 10);

  var noteWithImage = new Evernote.Note();
  var resourceTag = userClient.addResourceToNote(noteWithImage,
    fs.readFileSync(__dirname + "/bubble.jpg"),
    "image/jpeg");

  noteWithImage.content = wrapInsideEnNote(resourceTag);
  noteWithImage.title = "test";

  var request = new GetResourceRequest();
  var response = new GetResourceResponse();
  var noteId:string;
  userClient.createNote(noteWithImage).flatMap((note:Evernote.Note) => {
    noteId = note.guid;
    request.resourceId = note.resources[0].guid;
    return service.handle(request, response, Rx.Observable.just(testObjects.user));
  }).ignoreElements().toArray().doOnNext(() => {
    assert.equal(response.compressedResource.width, 0);
    assert.equal(response.compressedResource.height, 0);
    assert.equal(response.compressedResource.b64Data, "");
    assert.equal(response.compressedResource.id, request.resourceId);
    assert.equal(response.compressedResource.noteId, noteId);
    assert.equal(response.compressedResource.contentType, "image/jpeg");
  }).catch((e) => {
    assert.ok(false, e + "");
    return Rx.Observable.empty();
  }).flatMap(() => {
    if (noteId) return userClient.deleteNote(noteId);
    return Rx.Observable.empty();
  }).finally(assert.async()).subscribe();
});
