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
import {serializeEvernoteThrift} from "../thrift-tools/thrift-tools";
import {deserializeEvernoteThrift} from "../thrift-tools/thrift-tools";
import {EvernoteSyncService} from "../evernote-mediators/evernote-sync-service";

export class UpdateScheduleService implements ServiceHandler<UpdateScheduleRequest, UpdateScheduleResponse, User> {
  constructor(private evernoteClient:EvernoteClientRx,
              private schedulerStorage:MasterScheduleStorage,
              private syncService:EvernoteSyncService) {
  }

  endpoint = UpdateSchedule;

  getNote(userClient:EvernoteClientRx, noteId:string):Rx.Observable<Evernote.Note> {
    return this.schedulerStorage.getNoteContents(noteId).flatMap(noteCache => {
      if (noteCache == null) {
        return userClient.getNote(noteId);
      }

      var note = new Evernote.Note();
      deserializeEvernoteThrift(noteCache.contents, note);

      return Rx.Observable.just(note);
    })
  }

  handle(req:UpdateScheduleRequest, res:UpdateScheduleResponse, user$:Rx.Observable<User>) {
    var userClient:EvernoteClientRx;
    return user$.flatMap((user) => {
      return this.syncService.sync(user).ignoreElements().toArray().map(() => user);
    }).flatMap((user) => {
      userClient = this.evernoteClient.forUser(user);
      var updatesByNoteId = {} as {[k:string]:ScheduleUpdate[]};
      for (var scheduleUpdate of req.schedules) {
        var noteId = scheduleUpdate.scheduledIdentifier.clozeIdentifier.noteId;
        (updatesByNoteId[noteId] = updatesByNoteId[noteId] || [] as ScheduleUpdate[])
          .push(scheduleUpdate);
      }

      return Rx.Observable.merge<any>(Object.keys(updatesByNoteId).map((noteId) => {
        return this.getNote(userClient, noteId).flatMap(evernote => {
          var mapper = new NoteContentsMapper(evernote.content, updatesByNoteId[noteId]);
          mapper.map();
          evernote.content = mapper.document.toString();
          evernote.updated = Date.now();
          return userClient.updateNote(evernote).doOnNext((note:Evernote.Note) => {
            updatesByNoteId[noteId].forEach(update => {
              update.scheduledIdentifier.noteVersion = note.updateSequenceNum;
              res.completed.push(update.scheduledIdentifier);
            });
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