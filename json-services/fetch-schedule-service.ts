import { ServiceHandler } from "../web-server/service-handler";
import { FetchSchedule } from "../api/endpoints";
import { FetchScheduleRequest, FetchScheduleResponse, ScheduledClozeIdentifier } from "../api/api-models";
import {User} from "../user-model/user-model";
import * as Rx from "rx";
import {MasterScheduleStorage} from "../remote-storage/master-schedule-storage";
import {EvernoteSyncService} from "../evernote-mediators/evernote-sync-service";
import * as moment from "moment";
import {EvernoteClientRx} from "../evernote-client-rx/evernote-client-rx";
import {tap} from "../utils/obj";
import {mapEvernoteToNote} from "../evernote-mediators/map-evernote-to-note";
import {Note} from "../study-model/note-model";
import {Evernote} from "evernote";
import {deserializeEvernoteThrift} from "../thrift-tools/thrift-tools";

export class FetchScheduleService implements ServiceHandler<FetchScheduleRequest, FetchScheduleResponse, User> {
  constructor(private scheduleStorage:MasterScheduleStorage,
              private evernoteClient:EvernoteClientRx,
              private syncService:EvernoteSyncService,
              private timeProvider = () => new Date()) {
  }

  endpoint = FetchSchedule;

  getNote(userClient:EvernoteClientRx, noteId:string):Rx.Observable<Evernote.Note> {
    return this.scheduleStorage.getNoteContents(noteId).flatMap(noteCache => {
      if (noteCache == null) {
        return userClient.getNote(noteId);
      }

      var note = new Evernote.Note();
      deserializeEvernoteThrift(noteCache.contents, note);

      return Rx.Observable.just(note);
    })
  }

  handle(req:FetchScheduleRequest, res:FetchScheduleResponse, user$:Rx.Observable<User>) {
    var now = moment(this.timeProvider());
    var userClient:EvernoteClientRx;

    return user$.flatMap((user) => {
      return this.syncService.sync(user).ignoreElements().toArray().map(() => user);
    }).flatMap((user) => {
      userClient = this.evernoteClient.forUser(user);

      return userClient.listTagsByNotebook(user.studyBook.guid).flatMap(tags => {
        var tagGuids = tags.filter(tag => req.studyFilters.indexOf(tag.name) != -1)
          .map(tag => tag.guid);
        return this.scheduleStorage.findSchedule(user,
          Math.floor(now.unix()), req.requestedNum, tagGuids).toArray();
      });
    }).flatMap((scheduleRows) => {
      var expiration = Math.floor(now.add(1, 'minutes').unix());
      res.expires = expiration;
      scheduleRows.sort((a, b) => (a.clozeIdentifier < b.clozeIdentifier ? -1 : 1));
      scheduleRows.forEach(scheduleRow => {
        res.scheduled.push(tap(new ScheduledClozeIdentifier())(si => {
          si.clozeIdentifier.noteId = scheduleRow.noteId;
          si.clozeIdentifier.termMarker = scheduleRow.marker;
          si.clozeIdentifier.clozeIdx = scheduleRow.clozeIdx;
          si.noteVersion = scheduleRow.noteVersion;
        }))
      });
      return this.scheduleStorage.lease(scheduleRows, expiration)
        .toArray().map(() => scheduleRows);
    }).flatMap((scheduleRows) => {
      return Rx.Observable.from(scheduleRows.map(s => s.noteId).sort())
        .distinctUntilChanged()
        .concatMap<Evernote.Note>(noteId => this.getNote(userClient, noteId))
        .map(evernote => mapEvernoteToNote(evernote))
    }).doOnNext((note:Note) => {
      res.notes.push(note);
    });
  }
}