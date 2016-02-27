import {LocalStorage} from "./local-storage";
import {FetchScheduleResponse} from "../api/api-models";
import {ScheduledClozeIdentifier} from "../api/api-models";
import {Schedule} from "../study-model/schedule-model";
import {Note} from "../study-model/note-model";
import {ClozeIdentifier} from "../study-model/note-model";
import {sortableStringOfInteger} from "../string-sortables/string-sortables";
import {GetResourceResponse} from "../api/api-models";
import {Resource} from "../study-model/note-model";
import {GetLatestNoteResponse} from "../api/api-models";
import {UpdateScheduleResponse} from "../api/api-models";
import {ScheduleUpdate} from "../api/api-models";
import {tap} from "../utils/obj";
import {bisectStrings} from "../utils/bisect";
import {assignFromJson} from "../model-helpers/model-helpers";
import {LocalSettingsStorage} from "./local-settings-storage";

type ZippedFetchResult = [ScheduledClozeIdentifier, Schedule, number];
const PREFIX = 0;
const IDENT = 1;
const VERSION = 2;
const RESOURCE_NOTE_IDENT = 2;
const SCHEDULED_EXPIRES = 3;
const SCHEDULED_DUE_AT = 4;
const SEPARATOR = ",";
const SCHEDULED_PREFIX = "sc";
const NOTE_PREFIX = "no";
const RESOURCE_PREFIX = "re";
const SCHEDULE_UPDATE_PREFIX = "su";
const START_STR = String.fromCharCode(1);
const END_STR = String.fromCharCode(254);

if (START_STR > SEPARATOR || END_STR < SEPARATOR) {
  throw new Error("Bad values for separate and suffixes");
}

export class ScheduledStudy {
  scheduledClozes = [] as ScheduledClozeIdentifier[]
  notes = {} as {[k:string]:Note}
}

export class LocalStudyStorage {
  constructor(private localStorage:LocalStorage,
              private localSettingsStorage:LocalSettingsStorage,
              private timeProvider = () => new Date()) {
  }

  getSchedule():ScheduledStudy {
    var nowUnixTime = this.timeProvider().getTime() / 1000;
    var nowMinutes = Math.floor(nowUnixTime / 60);
    return tap(new ScheduledStudy())((result:ScheduledStudy) => {
      var sortedKeys = this.localStorage.keys().sort();
      var startIdx = this.startIdx(SCHEDULED_PREFIX, sortedKeys);
      var endIdx = this.endIdx(SCHEDULED_PREFIX, sortedKeys);

      var dueKeys = [] as string[][];
      this.iterAndPruneVersionedKeys(sortedKeys, startIdx, endIdx, (nextStored:string[]) => {
        var expires = nextStored[SCHEDULED_EXPIRES];

        if (nowUnixTime > parseInt(expires, 10)) {
          this.localStorage.remove(nextStored.join(SEPARATOR));
          return;
        }

        dueKeys.push(nextStored)
      });

      var seqOfKey = (key:string[]) => {
        var dueAtMinutes = parseInt(key[SCHEDULED_DUE_AT], 10);
        if (dueAtMinutes < nowMinutes) {
          return nowMinutes - dueAtMinutes;
        }
        return nowMinutes;
      };

      dueKeys.sort((a, b) => {
        return seqOfKey(a) - seqOfKey(b);
      });

      for (var nextDueKey of dueKeys) {
        var nextJson = this.localStorage.get(nextDueKey.join(SEPARATOR));

        if (nextJson != null) {
          var sci = tap(new ScheduledClozeIdentifier())(next => {
            if (!assignFromJson(next, nextJson)) {
              console.error("Could not assign from local storage json", nextJson);
            }
          });

          var note = result.notes[sci.clozeIdentifier.noteId];
          if (note == null) {
            note = (result.notes[sci.clozeIdentifier.noteId]
              = this.getNote(sci.clozeIdentifier.noteId));
          }
          if (note == null || note.findCloze(sci.clozeIdentifier) == null) {
            this.localStorage.remove(nextDueKey.join(SEPARATOR));
            continue;
          }

          result.scheduledClozes.push(sci);
        }
      }
    });
  }

  getResource(resourceId:string) {
    return this.get<Resource>(resourceId, Resource, RESOURCE_PREFIX);
  }

  getNote(noteId:string) {
    return this.get<Note>(noteId, Note, NOTE_PREFIX);
  }

  private get<T>(ident:string, constructor:{new():T}, prefix:string) {
    var sortedKeys = this.localStorage.keys().sort();
    var endKey = prefix + SEPARATOR + ident + SEPARATOR + END_STR;
    var keyIdx = bisectStrings(endKey, sortedKeys, true) - 1;
    if (keyIdx < 0) return null;
    var key = sortedKeys[keyIdx].split(SEPARATOR);
    if (key[IDENT] === ident && key[PREFIX] === prefix) {
      var json = this.localStorage.get(sortedKeys[keyIdx]);
      if (json != null) {
        return tap(new constructor())(result=> {
          if (!assignFromJson(result, json)) {
            console.error("Failed to assign json from storage", json);
          }
        });
      }
    }
    return null;
  }

  getScheduleUpdates():ScheduleUpdate[] {
    return tap([])((result:ScheduleUpdate[]) => {
      var sortedKeys = this.localStorage.keys().sort();
      var startIdx = this.startIdx(SCHEDULE_UPDATE_PREFIX, sortedKeys);
      var endIdx = this.endIdx(SCHEDULE_UPDATE_PREFIX, sortedKeys);
      this.iterAndPruneVersionedKeys(sortedKeys, startIdx, endIdx, (nextStored:string[]) => {
        var next = this.localStorage.get(nextStored.join(SEPARATOR));
        if (next != null) {
          result.push(tap(new ScheduleUpdate())(su => {
            if (!assignFromJson(su, next)) {
              console.error("Failed to assign json from storage", next);
            }
          }));
        }
      })
    });
  }

  recordScheduleUpdate(scheduleUpdate:ScheduleUpdate) {
    if (this.localSettingsStorage.authenticateWriteSession()) {
      var scheduledIdentifier = scheduleUpdate.scheduledIdentifier;
      var key = [SCHEDULE_UPDATE_PREFIX, scheduledIdentifier.clozeIdentifier.toString(),
        sortableStringOfInteger(scheduledIdentifier.noteVersion)].join(SEPARATOR);
      this.localStorage.set(key, scheduleUpdate);

      var sortedKeys = this.localStorage.keys().sort();
      var ident = scheduleUpdate.scheduledIdentifier.clozeIdentifier.toString();
      var scheduledIdentPrefix = SCHEDULED_PREFIX + SEPARATOR + ident;
      var startScheduledKey = this.startIdx(scheduledIdentPrefix, sortedKeys);
      var stopScheduledKey = this.endIdx(scheduledIdentPrefix, sortedKeys);
      for (; startScheduledKey < stopScheduledKey; ++startScheduledKey) {
        this.localStorage.remove(sortedKeys[startScheduledKey]);
      }
    }
  }

  storeUpdateScheduleResponse(updateScheduleResponse:UpdateScheduleResponse) {
    if (this.localSettingsStorage.authenticateWriteSession()) {
      var sortedKeys = this.localStorage.keys().sort();

      var completedClozes:{[k:string]:ScheduledClozeIdentifier} = {};

      for (var scheduledClozeIdent of updateScheduleResponse.completed) {
        completedClozes[scheduledClozeIdent.clozeIdentifier.toString()] = scheduledClozeIdent;
      }

      var startIdx = this.startIdx(SCHEDULE_UPDATE_PREFIX, sortedKeys);
      var endIdx = this.endIdx(SCHEDULE_UPDATE_PREFIX, sortedKeys);
      this.iterAndPruneVersionedKeys(sortedKeys, startIdx, endIdx, (nextStored:string[]) => {
        var version = nextStored[VERSION];
        var ident = nextStored[IDENT];
        var noteId = ClozeIdentifier.noteIdentifierOf(ident);
        var completedOfUpdated = completedClozes[ident];
        if (completedOfUpdated == null) {
          return;
        }
        if (sortableStringOfInteger(completedOfUpdated.noteVersion) < version) {
          return;
        }
        this.localStorage.remove(nextStored.join(SEPARATOR));
      });
    }
  }

  storeNoteResponse(latestNoteResponse:GetLatestNoteResponse) {
    if (this.localSettingsStorage.authenticateWriteSession()) {
      if (latestNoteResponse.wasUpToDate) return;
      this.storeNote(latestNoteResponse.note);
    }
  }

  storeResourceResponse(resourceResponse:GetResourceResponse) {
    if (this.localSettingsStorage.authenticateWriteSession()) {
      this.storeResource(resourceResponse.compressedResource);
    }
  }

  storeFetchResponse(fetchResponse:FetchScheduleResponse) {
    if (this.localSettingsStorage.authenticateWriteSession()) {
      var sortedKeys = this.localStorage.keys().sort();
      var seenNotes:{[k:string]:boolean} = {};

      var notesById = {} as {[k:string]:Note};
      for (var note of fetchResponse.notes) {
        notesById[note.id] = note;
      }

      for (var scheduledCloze of fetchResponse.scheduled) {
        var noteInResponse = notesById[scheduledCloze.clozeIdentifier.noteId];
        if (noteInResponse != null) {
          var schedule = noteInResponse.findCloze(scheduledCloze.clozeIdentifier).schedule;
          seenNotes[scheduledCloze.clozeIdentifier.noteId] = true;
          this.storeScheduled([scheduledCloze, schedule, fetchResponse.expires]);
        }
      }

      this.iterAndPruneVersionedKeys(sortedKeys,
        this.startIdx(SCHEDULED_PREFIX, sortedKeys),
        this.endIdx(SCHEDULED_PREFIX, sortedKeys), (nextStored:string[]) => {
          seenNotes[ClozeIdentifier.noteIdentifierOf(nextStored[IDENT])] = true;
        });

      this.clearUnusedResources(sortedKeys, seenNotes);
      this.pruneAndStoreNotes(sortedKeys, seenNotes, notesById);
    }
  }

  private storeNote(note:Note) {
    var key = [NOTE_PREFIX, note.id, sortableStringOfInteger(note.version)].join(SEPARATOR);
    this.localStorage.set(key, note);
  }

  private storeResource(resource:Resource) {
    var key = [RESOURCE_PREFIX, resource.id, resource.noteId].join(SEPARATOR);
    this.localStorage.set(key, resource);
  }

  private clearUnusedResources(sortedKeys:string[], seenNotes:{[k:string]:boolean}) {
    var resourceIdx = this.startIdx(RESOURCE_PREFIX, sortedKeys);
    var end = this.endIdx(RESOURCE_PREFIX, sortedKeys);

    for (; resourceIdx < end; ++resourceIdx) {
      var resourceKey = sortedKeys[resourceIdx].split(SEPARATOR);
      if (!seenNotes[resourceKey[RESOURCE_NOTE_IDENT]]) {
        this.localStorage.remove(sortedKeys[resourceIdx]);
      }
    }
  }

  private pruneAndIterNotes(sortedKeys:string[],
                            seenNotes:{[k:string]:boolean},
                            cb?:(nextStored:string[])=>void) {
    var noteIdx = this.startIdx(NOTE_PREFIX, sortedKeys);
    var end = this.endIdx(NOTE_PREFIX, sortedKeys);
    this.iterAndPruneVersionedKeys(sortedKeys, noteIdx, end, (nextStored:string[]) => {
      var ident = nextStored[IDENT];
      if (!seenNotes[ident]) {
        this.localStorage.remove(nextStored.join(SEPARATOR));
        return;
      }

      if (cb) cb(nextStored);
    });
  }

  private pruneAndStoreNotes(sortedKeys:string[], seenNotes:{[k:string]:boolean},
                             notesById:{[k:string]:Note}) {
    this.pruneAndIterNotes(sortedKeys, seenNotes, (nextStored:string[]) => {
      var ident = nextStored[IDENT];
      note = notesById[ident];
      if (!note) return;

      var versionString = sortableStringOfInteger(note.version);
      if (versionString <= nextStored[VERSION]) {
        delete notesById[ident];
      }
    });

    for (var noteId in notesById) {
      var note = notesById[noteId];
      this.storeNote(note);
    }
  };

  private storeScheduled(scheduledCloze:ZippedFetchResult) {
    var [scheduledIdent, schedule] = scheduledCloze;
    var key = [
      SCHEDULED_PREFIX,
      scheduledIdent.clozeIdentifier.toString(),
      sortableStringOfInteger(scheduledIdent.noteVersion),
      scheduledCloze[2],
      schedule.dueAtMinutes
    ].join(SEPARATOR);
    this.localStorage.set(key, scheduledIdent);
  }

  private iterAndPruneVersionedKeys(sortedKeys:string[],
                                    startIdx:number,
                                    endIdx:number,
                                    iterF?:(latestVersion:string[])=>void) {
    var lastIdent:string;
    var versions:string[][] = [];
    var pushNext = () => {
      if (versions.length > 0) {
        for (var i = 0; i < versions.length - 1; ++i) {
          this.localStorage.remove(versions[i].join(SEPARATOR));
        }
        if (iterF) iterF(versions[versions.length - 1]);
      }
      lastIdent = ident;
      versions = [];
    };

    for (; startIdx < endIdx; ++startIdx) {
      var parts = sortedKeys[startIdx].split(SEPARATOR);
      var ident = parts[IDENT];
      if (ident !== lastIdent) {
        pushNext();
      }

      versions.push(parts);
    }

    pushNext();
  }

  private startIdx(prefix:string, sortedKeys:string[]) {
    return bisectStrings(prefix + SEPARATOR + START_STR, sortedKeys);
  }

  private endIdx(prefix:string, sortedKeys:string[]) {
    return bisectStrings(prefix + SEPARATOR + END_STR, sortedKeys, true);
  }
}