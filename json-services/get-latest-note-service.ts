import {ServiceHandler} from "../web-server/service-handler";
import {GetLatestNoteRequest} from "../api/api-models";
import {GetLatestNoteResponse} from "../api/api-models";
import {User} from "../user-model/user-model";
import {GetLatestNote} from "../api/endpoints";
import * as Rx from "rx";
import {EvernoteClientRx} from "../evernote-client-rx/evernote-client-rx";
import {Evernote} from "evernote";
import {mapEvernoteToNote} from "../evernote-mediators/map-evernote-to-note";

export class GetLatestNoteService implements ServiceHandler<GetLatestNoteRequest, GetLatestNoteResponse, User> {
  constructor(private evernoteClient:EvernoteClientRx) {
  }

  endpoint = GetLatestNote;

  handle(req:GetLatestNoteRequest, res:GetLatestNoteResponse, user$:Rx.Observable<User>) {
    var userClient:EvernoteClientRx;
    return user$.flatMap(user => {
      userClient = this.evernoteClient.forUser(user);

      return userClient.getNote(req.noteId, false, false)
    }).flatMap((note:Evernote.Note) => {
      if (note.updateSequenceNum <= req.noteVersion) {
        res.wasUpToDate = true;
        return Rx.Observable.empty<Evernote.Note>();
      }

      return userClient.getNote(req.noteId, true, false);
    }).doOnNext((note:Evernote.Note) => {
      res.wasUpToDate = false;
      res.note = mapEvernoteToNote(note);
    });
  }
}