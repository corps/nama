import {ServiceHandler} from "../web-server/service-handler";
import {GetLatestNoteRequest, GetMcdsRequest, GetMcdsResponse} from "../api/api-models";
import {GetLatestNoteResponse} from "../api/api-models";
import {User} from "../user-model/user-model";
import {GetMcds} from "../api/endpoints";
import * as Rx from "rx";
import {EvernoteClientRx} from "../evernote-client-rx/evernote-client-rx";
import {Evernote} from "evernote";
import {mapEvernoteToNote} from "../evernote-mediators/map-evernote-to-note";
import {EvernoteSyncService} from "../evernote-mediators/evernote-sync-service";
import {MasterScheduleStorage, NoteContentsRow} from "../remote-storage/master-schedule-storage";
import {NoteContentsMapper} from "../evernote-mediators/note-contents-mapper";
import {Note} from "../study-model/note-model";
import {deserializeEvernoteThrift} from "../thrift-tools/thrift-tools";

export class GetMcdsService implements ServiceHandler<GetMcdsRequest, GetMcdsResponse, User> {
  constructor(private evernoteClient: EvernoteClientRx,
              private schedulerStorage: MasterScheduleStorage,
              private syncService: EvernoteSyncService,
              private timeProvider: () => Date) {
  }

  endpoint = GetMcds;

  handle(req: GetMcdsRequest, res: GetMcdsResponse, user$: Rx.Observable<User>) {
    var userClient: EvernoteClientRx;
    return user$.flatMap(user => {
      return this.syncService.sync(user).ignoreElements().toArray().map(() => user);
    }).flatMap(user => {
      userClient = this.evernoteClient.forUser(user);

      return this.schedulerStorage.getRecentContents(user.id, 20, req.ignoreIds);
    }).doOnNext((contentsRow: NoteContentsRow) => {
      var evernote = new Evernote.Note();
      deserializeEvernoteThrift(contentsRow.contents, evernote);
      res.notes.push(mapEvernoteToNote(evernote, this.timeProvider))
    });
  }
}