import {PutMcdsResponse, PutMcdsRequest} from "../api/api-models";
import {User} from "../user-model/user-model";
import {ServiceHandler} from "../web-server/service-handler";
import {PutMcds} from "../api/endpoints";
import {EvernoteClientRx} from "../evernote-client-rx/evernote-client-rx";
import {Evernote} from "evernote";
import * as Rx from "rx";
import {Note} from "../study-model/note-model";
import {MasterScheduleStorage} from "../remote-storage/master-schedule-storage";

export class PutMcdsService implements ServiceHandler<PutMcdsRequest, PutMcdsResponse, User> {
  constructor(private evernoteClient:EvernoteClientRx,
              private scheduleStorage:MasterScheduleStorage) {
  }

  endpoint = PutMcds;

  handle(req:PutMcdsRequest, res:PutMcdsResponse, user$:Rx.Observable<User>) {
    var userClient:EvernoteClientRx;
    return user$.flatMap((user:User) => {
      userClient = this.evernoteClient.forUser(user);

      return req.notes;
    }).flatMap((note:Note) => {
      var evernote = new Evernote.Note();
      evernote.guid = note.id;
      evernote.updateSequenceNum = note.version;
      evernote.title = note.terms.map(t => t.original).join(", ");
      evernote.updated = Date.now();
      evernote.content = note.toEvernoteContent();

      return userClient.updateNote(evernote).catch((e) => {
        if (e.rateLimitDuration) {
          return Rx.Observable.throw(e);
        }
        return Rx.Observable.just(evernote);
      }).doOnNext((note:Evernote.Note) => {
        res.completedIds.push(note.guid);
      }).catch((e) => {
        console.error(e);
        return Rx.Observable.just(null);
      }).toArray().flatMap(() => {
        return this.scheduleStorage.commitNoteContents(res.completedIds);
      });
    });
  }
}