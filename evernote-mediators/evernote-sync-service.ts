import {UserStorage} from "../remote-storage/user-storage";
import {MasterScheduleStorage} from "../remote-storage/master-schedule-storage";
import {EvernoteClientRx} from "../evernote-client-rx/evernote-client-rx";
import * as Rx from "rx";
import {User, StudyBook} from "../user-model/user-model";
import { Evernote } from "evernote";
import { tap, transform } from "../utils/obj";
import {ClozeIdentifier} from "../study-model/note-model";
import {mapEvernoteToNote} from "./map-evernote-to-note";

interface SyncBatch {
  studyBookId: number
  studyBookGuid: string
  syncState: number
  user: User
}

export class EvernoteSyncService {
  protected runningProcesses:{[k:number]:Rx.Observable<any>} = {};

  constructor(private userStorage:UserStorage,
              private evernoteClient:EvernoteClientRx,
              private scheduleStorage:MasterScheduleStorage,
              private batchSize = 40,
              private defaultNotebookName = "弁SRS Study Book") {
  }

  sync<T>(user:User):Rx.Observable<T> {
    if (this.runningProcesses[user.id] == null) {
      this.runningProcesses[user.id] = this.createSyncFor(user);
    }
    return this.runningProcesses[user.id] as any;
  }

  private createSyncFor(user:User):Rx.Observable<void> {
    return tap(new Rx.AsyncSubject<void>())(s => {
      this.innerSync(user)
        .finally(() => {
          delete this.runningProcesses[user.id];
        })
        .subscribe(s);
    });
  }

  protected innerSync(user:User):Rx.Observable<any> {
    return this.findOrCreateStudyBook(user)
      .flatMap((studyBook) => this.loadUserStudyBook(user, studyBook))
      .flatMap(b => this.processBatch(b));
  }

  private loadUserStudyBook(user:User, studyBook:[string, number]):Rx.Observable<SyncBatch> {
    var [guid, syncedState] = studyBook;
    if (guid !== user.studyBook.guid) {
      return this.userStorage.addNewStudyBook(user.id, guid, syncedState).map((id) => {
        user.studyBook.id = id;
        user.studyBook.guid = guid;
        user.studyBook.syncVersion = syncedState;
        return {
          studyBookId: id,
          studyBookGuid: guid,
          syncState: syncedState,
          user: user
        } as SyncBatch;
      })
    }

    return Rx.Observable.just({
      studyBookId: user.studyBook.id,
      studyBookGuid: user.studyBook.guid,
      syncState: syncedState,
      user: user
    } as SyncBatch)
  }

  private syncFilter = tap(new Evernote.SyncChunkFilter())(
    (filter:Evernote.SyncChunkFilter) => {
      filter.includeNotes = true;
      filter.includeExpunged = true;

      filter.includeResources = false;
      filter.includeSearches = false;
      filter.includeTags = false;
      filter.includeLinkedNotebooks = false;
      filter.includeNoteApplicationDataFullMap = false;
      filter.includeNotebooks = true;
      filter.includeNoteResourceApplicationDataFullMap = false;
      filter.includeNoteResources = false;
    });

  private processBatch(batchInfo:SyncBatch):Rx.Observable<any> {
    var userClient = this.evernoteClient.forUser(batchInfo.user);
    return userClient.sync(batchInfo.syncState, this.batchSize, this.syncFilter)
      .flatMap<Evernote.SyncChunk>(chunk => {
        if (chunk.chunkHighUSN == null) return Rx.Observable.just<any>(chunk);

        var inactiveNotes = chunk.expungedNotes || [] as string[];
        var notes = [] as Evernote.Note[];
        var notInStudyBookNotes = [] as Evernote.Note[];
        var inStudyBookNotes = [] as Evernote.Note[];

        if (chunk.notes != null) {
          for (var note of chunk.notes) {
            if (note.active) {
              notes.push(note);
            } else {
              inactiveNotes.push(note.guid);
            }
          }
        }

        for (var note of notes) {
          if (note.notebookGuid === batchInfo.studyBookGuid) {
            inStudyBookNotes.push(note);
          } else {
            notInStudyBookNotes.push(note);
          }
        }

        var deletedAllInactive$ =
          Rx.Observable.merge<any>(
            inactiveNotes.map(
              (id) => this.scheduleStorage.deleteAllInNote(id, chunk.chunkHighUSN)))
            .ignoreElements()
            .toArray();

        var deletedNotInStudyBook$ =
          Rx.Observable.merge<any>(
            notInStudyBookNotes.map(note =>
              this.scheduleStorage.deleteAllInNote(note.guid, note.updateSequenceNum)))
            .ignoreElements()
            .toArray();

        var updatedInStudyBook$ =
          Rx.Observable.merge<any>(
            inStudyBookNotes.map(note =>
              userClient.getNote(note.guid, true, false)
                .flatMap(note => this.processNoteUpdate(batchInfo.user, note))))
            .ignoreElements()
            .toArray();

        return Rx.Observable.merge(
          deletedAllInactive$, deletedNotInStudyBook$, updatedInStudyBook$
        ).ignoreElements().toArray().map(() => chunk)
      }).flatMap((chunk:Evernote.SyncChunk) => {
        return this.userStorage.updateStudyBook(batchInfo.user.studyBook.id, chunk.chunkHighUSN)
          .flatMap(() => {
            if (chunk.chunkHighUSN === chunk.updateCount) {
              return Rx.Observable.just(null);
            }

            return this.processBatch(transform<SyncBatch>(batchInfo)((info:SyncBatch) => {
              info.syncState = chunk.chunkHighUSN;
            }));
          });
      });
  }

  processNoteUpdate(user:User, evernote:Evernote.Note):Rx.Observable<any> {
    var note = mapEvernoteToNote(evernote);
    var version = evernote.updateSequenceNum;

    return Rx.Observable.merge(tap([] as Rx.Observable<any>[])(processes => {
      var markers = note.terms.map(term => term.marker);

      processes.push(this.scheduleStorage.deleteAllOtherTerms(note.id, markers, version));

      note.terms.forEach((term) => {
        processes.push(
          this.scheduleStorage.deleteAllOtherClozes(note.id, term.marker, term.clozes.length,
            version));
        term.clozes.forEach((cloze) => {
          var identifier = ClozeIdentifier.of(note, term, cloze);

          processes.push(this.scheduleStorage.recordSchedule(
            user, version, identifier, evernote.tagGuids || [], cloze.schedule))
        })
      })
    }));
  }

  findOrCreateStudyBook(user:User):Rx.Observable<[string, number]> {
    var userClient = this.evernoteClient.forUser(user);
    return userClient.listNotebooks().flatMap((notebooks:Evernote.Notebook[]) => {
      return userClient.getSyncState().flatMap((syncState) => {
        var existingBook = this.findStudyBookIn(user, notebooks, syncState);
        if (existingBook) return Rx.Observable.just(existingBook);

        return userClient.createNotebook(tap(new Evernote.Notebook)(n => {
          n.name = this.defaultNotebookName;
        })).map((newNotebook) => {
          return [newNotebook.guid, newNotebook.updateSequenceNum] as [string, number];
        });
      })
    })
  }

  private findStudyBookIn(user:User, notebooks:Evernote.Notebook[],
                          syncState:Evernote.SyncState):[string, number] {
    if (!notebooks) return null;
    var contingentBook:[string, number];
    for (var notebook of notebooks) {
      if (notebook.guid === user.studyBook.guid) return [notebook.guid, user.studyBook.syncVersion];
      if (notebook.name === this.defaultNotebookName) {
        return [notebook.guid, syncState.updateCount];
      }
    }
    return contingentBook;
  }
}