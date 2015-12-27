import {ServiceHandler} from "../web-server/service-handler";
import {UpdateScheduleRequest} from "../api/api-models";
import {UpdateScheduleResponse} from "../api/api-models";
import {UpdateSchedule} from "../api/endpoints";
import {EvernoteClientRx} from "../evernote-client-rx/evernote-client-rx";
import {User} from "../user-model/user-model";
import * as Rx from "rx";
import {ScheduleUpdate} from "../api/api-models";
import {NoteContentsMapper} from "../evernote-mediators/note-contents-mapper";
import {Evernote} from "evernote";

export class UpdateScheduleService implements ServiceHandler<UpdateScheduleRequest, UpdateScheduleResponse, User> {
  constructor(private evernoteClient:EvernoteClientRx) {
  }

  endpoint = UpdateSchedule;

  handle(req:UpdateScheduleRequest, res:UpdateScheduleResponse, user$:Rx.Observable<User>) {
    var userClient:EvernoteClientRx;
    return user$.flatMap((user) => {
      userClient = this.evernoteClient.forUser(user);
      var updatesByNoteId = {} as {[k:string]:ScheduleUpdate[]};
      for (var scheduleUpdate of req.schedules) {
        var noteId = scheduleUpdate.scheduledIdentifier.clozeIdentifier.noteId;
        (updatesByNoteId[noteId] = updatesByNoteId[noteId] || [] as ScheduleUpdate[])
          .push(scheduleUpdate);
      }

      return Rx.Observable.merge<any>(Object.keys(updatesByNoteId).map((noteId) => {
        return userClient.getNote(noteId)
          .flatMap((evernote:Evernote.Note) => {
            var mapper = new NoteContentsMapper(evernote.content, updatesByNoteId[noteId]);
            mapper.map();
            evernote.content = mapper.document.toString();
            evernote.updated = Date.now();
            return userClient.updateNote(evernote).doOnNext((note:Evernote.Note) => {
              updatesByNoteId[noteId].forEach(update => {
                update.scheduledIdentifier.noteVersion = note.updateSequenceNum;
                res.completed.push(update.scheduledIdentifier);
              })
            })
          }).catch((e) => {
            console.error(e);
            updatesByNoteId[noteId].forEach(update => {
              res.completed.push(update.scheduledIdentifier);
            });
            return Rx.Observable.empty();
          });
      }));
    });
  }
}