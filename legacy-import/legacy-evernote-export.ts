import { ImportMaterial } from "./legacy-model";
import { Evernote } from "evernote";
import { tap } from "../utils/obj";
import { User, OauthLogin } from "../user-model/user-model";
import {Cloze, formatCloze} from "../study-model/note-model";
import moment = require("moment");
import * as fs from "fs";
import * as Rx from "rx";
import {WebServerConfig} from "../web-server/web-server-config";
import {assignFromJson} from "../model-helpers/model-helpers";
import {EvernoteClientRx} from "../evernote-client-rx/evernote-client-rx";
import {EvernoteSyncService} from "../evernote-mediators/evernote-sync-service";
import {UserStorage} from "../remote-storage/user-storage";
import {DatabaseRx} from "../database-rx/database-rx";
import {ScheduledStudy} from "../local-storage/local-study-storage";
import {MasterScheduleStorage} from "../remote-storage/master-schedule-storage";
import {XmlEntities} from "html-entities";
import {mapEvernoteToNote} from "../evernote-mediators/map-evernote-to-note";
import {ClozeIdentifier} from "../study-model/note-model";
import {serializeEvernoteThrift} from "../thrift-tools/thrift-tools";

function encloseInEnml(body:string) {
  return `<?xml version='1.0' encoding='utf-8'?>
<!DOCTYPE en-note SYSTEM "http://xml.evernote.com/pub/enml2.dtd">
<en-note style="margin:20px">${body}</en-note>`
}

var entities = new XmlEntities();

function asNote(material:ImportMaterial) {
  return tap(new Evernote.Note())((n:Evernote.Note) => {
    n.title = material.terms.map(t => t.term).join(", ") + "-- Imported";
    n.content = entities.encode(material.content).replace("\b", "").replace(/\n/g, "<br/>");
    n.content += "<br/>";

    if (material.terms == null) return;

    material.terms.forEach(term => {
      n.content += `<br/>[${term.marker}] ${term.term}<br/>`;

      term.clozes.forEach(iCloze => {
        var cloze = new Cloze();
        cloze.segment = iCloze.cloze;
        cloze.schedule.dueAtMinutes = Math.floor(iCloze.due_at / 60000);
        cloze.schedule.lastAnsweredMinutes = Math.floor(iCloze.last_answered / 60000);
        cloze.schedule.intervalMinutes = Math.floor(iCloze.interval / 60000);
        cloze.schedule.isNew = false;
        n.content += formatCloze(cloze) + "<br/>";
      });

      n.content += entities.encode(term.answer_details).replace("\b", "") + "<br/>";
    });

    n.content = encloseInEnml(n.content);
  });
}

export function exportToEvernote(material:ImportMaterial, evernoteClient:EvernoteClientRx,
                                 user:User):Rx.Observable<Evernote.Note> {
  var userClient = evernoteClient.forUser(user);
  var note = asNote(material);
  note.tagNames = ["Japanese"];
  note.notebookGuid = user.studyBook.guid;
  return userClient.createNote(note);
}

if (require.main === module) {
  var materials = JSON.parse(
    fs.readFileSync(process.argv[2]).toString("utf-8")) as ImportMaterial[];

  DatabaseRx.open('ben.sqlite3').flatMap((db) => {
    var savedConfig = JSON.parse(fs.readFileSync(__dirname + "/../config.json", "utf8"));
    var config = new WebServerConfig();
    assignFromJson(config, savedConfig);

    var evernoteClient = new EvernoteClientRx(config.evernoteConfig, undefined, true);
    var userStorage = new UserStorage(db);
    var scheduleStorage = new MasterScheduleStorage(db);
    var syncService = new EvernoteSyncService(userStorage, evernoteClient, scheduleStorage, 100);
    var ids = JSON.parse(fs.readFileSync("ids.json", "utf-8"));

    process.stdout.write("Starting export");

    var user:User;
    var interval = setInterval(() => {
    }, 100000);
    return userStorage.lookupUserById(1).flatMap((_user) => {
      user = _user;
      return syncService.findOrCreateStudyBook(user);
    }).flatMap(([studyBookGuid, v]) => {
      if (studyBookGuid != user.studyBook.guid) {
        user.studyBook.guid = studyBookGuid;
        return userStorage.addNewStudyBook(user.id, studyBookGuid, v)
          .doOnNext((lastId) => user.studyBook.id = lastId);
      }
      return Rx.Observable.just(null);
    }).flatMap(() => {
      function performBatch():Rx.Observable<any> {
        var nextBatch = materials.splice(0, 10);
        if (nextBatch.length == 0) {
          return Rx.Observable.empty();
        }

        nextBatch = nextBatch.filter(m => {
          var mId = JSON.stringify(m).split("").sort().join("");
          return !ids[mId];
        });

        if (nextBatch.length === 0) {
          console.log("skipping ahead");
          return Rx.Observable.just(null).flatMap(() => performBatch());
        }

        var processes = nextBatch.map(material => {
          return exportToEvernote(material, evernoteClient, user)
            .flatMap((evernote) => {
              evernote.content = asNote(material).content;
              return scheduleStorage.recordNoteContents(user.id,
                evernote.guid, evernote.updateSequenceNum, serializeEvernoteThrift(evernote))
                .flatMap(() => {
                  var note = mapEvernoteToNote(evernote);
                  var processes = [] as Rx.Observable<any>[];
                  for (var term of note.terms) {
                    for (var cloze of term.clozes) {
                      var identifier = ClozeIdentifier.of(note, term, cloze);
                      processes.push(
                        scheduleStorage.recordSchedule(user, evernote.updateSequenceNum, identifier,
                          evernote.tagGuids || [], cloze.schedule));
                    }
                  }

                  processes.push(
                    userStorage.updateStudyBook(user.studyBook.id, evernote.updateSequenceNum));
                  return Rx.Observable.merge(processes);
                })
            }).ignoreElements().toArray()
            .doOnCompleted(() => {
              process.stdout.write(".");
              var mId = JSON.stringify(material).split("").sort().join("");
              ids[mId] = true;
              fs.writeFileSync("ids.json", JSON.stringify(ids), {encoding: "utf-8"});
            }).doOnError((e) => {
              console.log("material", material, e);
            });
        });

        return Rx.Observable.merge(processes).ignoreElements().toArray()
          .flatMap(() => performBatch().delay(15));
      }

      return performBatch().doOnCompleted(() => {
        process.stdout.write("\nDone!");
        clearInterval(interval);
      })
    }).doOnError((e) => {
      fs.writeFileSync("ids.json", JSON.stringify(ids), {encoding: "utf-8"});
    })
  }).subscribe();
}
