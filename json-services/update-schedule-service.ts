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
import {MasterScheduleStorage} from "../remote-storage/master-schedule-storage";
import {NoteContentsRow} from "../remote-storage/master-schedule-storage";

export class UpdateScheduleService implements ServiceHandler<UpdateScheduleRequest, UpdateScheduleResponse, User> {
  constructor(private evernoteClient:EvernoteClientRx,
              private schedulerStorage:MasterScheduleStorage) {
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
        return this.schedulerStorage.getNoteContents(noteId)
          .flatMap((noteContentsRow:NoteContentsRow) => {
            var mapper = new NoteContentsMapper(noteContentsRow.contents, updatesByNoteId[noteId]);
            mapper.map();
            var evernote = new Evernote.Note();
            evernote.updateSequenceNum = noteContentsRow.noteVersion;
            evernote.content = mapper.document.toString();
            evernote.updated = Date.now();
            evernote.guid = noteId;
            return userClient.updateNote(evernote).flatMap<any>((note:Evernote.Note) => {
              updatesByNoteId[noteId].forEach(update => {
                update.scheduledIdentifier.noteVersion = note.updateSequenceNum;
                res.completed.push(update.scheduledIdentifier);
              });

              return this.schedulerStorage.recordNoteContents(
                noteId, note.updateSequenceNum, note.content);
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