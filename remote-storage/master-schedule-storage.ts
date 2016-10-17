import {ClozeIdentifier} from "../study-model/note-model";
import {Schedule} from "../study-model/schedule-model";
import * as Rx from "rx";
import {User} from "../user-model/user-model";
import {tap} from "../utils/obj";
import {DatabaseRx} from "../database-rx/database-rx";

export class MasterScheduleStorage {
  constructor(private db: DatabaseRx) {
  }

  recordNoteContents(userId: number, noteId: string, noteVersion: number,
                     contents: string): Rx.Observable<void> {
    return this.db.run(
      "INSERT INTO noteContents (userId, noteId, noteVersion, contents, committed) " +
      "VALUES (?, ?, ?, ?, 0);", [
        userId, noteId, noteVersion, contents
      ]).catch((e) => {
      if (e.toString().indexOf("UNIQUE constraint failed") != -1) {
        return this.db.run(
          "UPDATE noteContents SET noteVersion = ?, contents = ? " +
          "WHERE noteVersion < ? AND noteId = ?", [
            noteVersion, contents, noteVersion, noteId
          ]);
      }
      throw e;
    }).map(() => null);
  }

  clearLeases(clozeIdentifiers:string[]) {
    return this.db.run(
      "UPDATE schedule SET leaseExpiresAtUnix = -1 WHERE clozeIdentifier IN (" +
      clozeIdentifiers.map(s => "?").join(", ") + ")", clozeIdentifiers);
  }

  commitNoteContents(noteIds: string[], committed = true) {
    var committedValue = committed ? 1 : 0;

    return this.db.run(
      "UPDATE noteContents SET committed = " +
      committedValue +
      " WHERE noteId IN (" + noteIds.map(
        s => "?")
        .join(",") + ")", noteIds).map(() => null);
  }

  getNoteContents(noteId: string): Rx.Observable<NoteContentsRow> {
    return this.db.get("SELECT * FROM noteContents WHERE noteId = ?", [noteId]);
  }

  getRecentContents(userId: number, count: number,
                    excludedIds: string[]): Rx.Observable<NoteContentsRow> {
    var noteIdClause = excludedIds.length > 0 ? "noteId NOT IN (" + excludedIds.map(s => "?")
      .join(",") + ") AND " : "";
    return this.db.each(
      "SELECT * FROM noteContents WHERE userId = ? AND " + noteIdClause +
      "committed = 0 ORDER BY id DESC LIMIT ?",
      (excludedIds as any[]).concat([userId, count]));
  }

  recordSchedule(user: User,
                 noteVersion: number,
                 clozeIdentifier: ClozeIdentifier,
                 tags: string[],
                 schedule: Schedule,
                 clearLease = false): Rx.Observable<void> {
    var normalizedTags = " " + tags.join(" ") + " ";

    return this.db.run("INSERT INTO schedule " +
      "(clozeIdentifier, studyBookId, noteId, marker, clozeIdx, dueAtMinutes, noteVersion, tags) " +
      "VALUES (?, ?, ?, ?, ?, ?, ?, ?)", [
      clozeIdentifier.toString(),
      user.studyBook.id,
      clozeIdentifier.noteId,
      clozeIdentifier.termMarker,
      clozeIdentifier.clozeIdx,
      schedule.dueAtMinutes,
      noteVersion,
      normalizedTags
    ]).catch((e) => {
      if (e.toString().indexOf("UNIQUE constraint failed") != -1) {
        var clearLeaseSql = clearLease ? ", leaseExpiresAtUnix = -1" : "";
        return this.db.run("UPDATE schedule SET " +
          "dueAtMinutes = ?, noteVersion = ?, tags = ?, studyBookId = ?" + clearLeaseSql +
          " WHERE clozeIdentifier = ? AND noteVersion < ?", [
          schedule.dueAtMinutes,
          noteVersion,
          normalizedTags,
          user.studyBook.id,
          clozeIdentifier.toString(),
          noteVersion
        ]);
      }
      throw e;
    }).map(() => null)
  }

  findSchedule(user: User, curTimeUnix: number, maxResults: number, tags: string[]) {
    var futureDue = new Rx.Subject<ScheduleRow>();
    return this.findSchedulePart(user, curTimeUnix, maxResults, tags, false)
      .doOnNext(() => maxResults -= 1)
      .doOnCompleted(() => {
        this.findSchedulePart(user, curTimeUnix, maxResults, tags, true).subscribe(futureDue);
      }).concat(futureDue);
  }

  deleteAllInNote(noteId: string, version: number): Rx.Observable<any> {
    return this.db.run("DELETE FROM schedule WHERE noteId = ? AND noteVersion < ? ",
      [noteId, version]).flatMap(() => {
      return this.db.run("DELETE FROM noteContents WHERE noteId = ? AND noteVersion < ?",
        [noteId, version]);
    });
  }

  deleteAllOtherTerms(noteId: string, foundTermMarkers: string[],
                      version: number): Rx.Observable<any> {
    return this.db.run("DELETE FROM schedule WHERE noteId = ? AND noteVersion < ?" +
      "AND marker NOT IN (" + foundTermMarkers.map(() => "?").join(", ") + ")",
      ([noteId, version] as any[]).concat(foundTermMarkers))
  }

  deleteAllOtherClozes(noteId: string, termMarker: string, clozeLength: number,
                       version: number): Rx.Observable<any> {
    return this.db.run("DELETE FROM schedule WHERE noteId = ? AND noteVersion < ? AND marker = ? " +
      "AND clozeIdx >= ?", [noteId, version, termMarker, clozeLength]);
  }

  findNumDue(user: User, untilUnix: number, tags: string[]): Rx.Observable<number> {
    var tagConditional = tags.length == 0
      ? ""
      : "AND " + tags.map(tag => `instr(tags, ?) > 0`).join(" AND ") + " "

    var tagChecks = tags.map(tag => ` ${tag} `);

    return this.db.get("SELECT COUNT(*) as count FROM schedule " +
      "WHERE studyBookId = ? AND dueAtMinutes <= ?" + tagConditional,
      ([user.studyBook.id, Math.floor(untilUnix / 60)] as any[])
        .concat(tagChecks)).map(result => result.count);
  }

  lease(scheduleRows: ScheduleRow[], expiration: number) {
    return this.db.run("UPDATE schedule SET leaseExpiresAtUnix = ? " +
      "WHERE id IN (" + scheduleRows.map(() => "?").join(",") + ")",
      [expiration].concat(scheduleRows.map(sr => sr.id)));
  }

  private findSchedulePart(user: User,
                           curTimeUnix: number,
                           maxResults: number,
                           tags: string[],
                           ascending: boolean) {
    if (maxResults <= 0) return Rx.Observable.empty<ScheduleRow>();

    var tagConditional = tags.length == 0
      ? ""
      : "AND " + tags.map(tag => `instr(tags, ?) > 0`).join(" AND ") + " "

    var tagChecks = tags.map(tag => ` ${tag} `);

    var inequality = ascending ? ">" : "<=";
    var orderDir = ascending ? "ASC" : "DESC";
    return this.db.each("SELECT * FROM schedule " +
      "WHERE studyBookId = ? AND dueAtMinutes " + inequality + " ? " +
      tagConditional +
      "AND leaseExpiresAtUnix < ? " +
      "ORDER BY dueAtMinutes " + orderDir + " LIMIT ?",
      ([user.studyBook.id, Math.floor(curTimeUnix / 60)] as any[])
        .concat(tagChecks)
        .concat([curTimeUnix, maxResults])
    ) as Rx.Observable<ScheduleRow>;
  }
}

export interface ScheduleRow {
  id: number
  clozeIdentifier: string
  studyBookId: number
  noteId: string
  marker: string
  clozeIdx: number
  dueAtMinutes: number
  noteVersion: number
  tags: string
}

export interface NoteContentsRow {
  id: number
  noteId: string
  noteVersion: number
  contents: string
}