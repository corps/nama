import {PutMcdsResponse, PutMcdsRequest} from "../api/api-models";
import {User} from "../user-model/user-model";
import {ServiceHandler} from "../web-server/service-handler";
import {PutMcds} from "../api/endpoints";
import {EvernoteSyncService} from "../evernote-mediators/evernote-sync-service";
import {MasterScheduleStorage} from "../remote-storage/master-schedule-storage";
import {EvernoteClientRx} from "../evernote-client-rx/evernote-client-rx";
import {Evernote} from "evernote";
import * as Rx from "rx";
import {Note, Term} from "../study-model/note-model";
import {formatCloze} from "../evernote-mediators/note-contents-mapper";
import {XmlEntities} from "html-entities";

var entities = new XmlEntities();

export class PutMcdsService implements ServiceHandler<PutMcdsRequest, PutMcdsResponse, User> {
  constructor(private evernoteClient:EvernoteClientRx) {
  }

  endpoint = PutMcds;

  handle(req:PutMcdsRequest, res:PutMcdsResponse, user$:Rx.Observable<User>) {
    var userClient:EvernoteClientRx;
    return user$.flatMap((user:User) => {
      userClient = this.evernoteClient.forUser(user);

      return req.notes;
    }).flatMap((note:Note) => {
      return userClient.getNote(note.id, false).flatMap((evernote:Evernote.Note) => {
        evernote.title = note.terms.map(t => t.original).join(", ");
        evernote.updated = Date.now();

        var contentText = note.text
          .replace(/\r\n/g, "\n")
          .split("\n").map(l => l.trim()).join("\n")
          .replace(/\n\n/g, "\n");

        if (note.terms.length > 0) contentText += "\n\n";

        contentText += note.terms.map((t:Term) => {
          var lines = [] as string[];

          lines.push("[" + t.marker + "] " + t.original);
          if (t.hint) lines.push("? " + t.hint.replace(/\n/, " ").trim());

          t.clozes.forEach(cloze => {
            lines.push(formatCloze(cloze));
          });

          lines.push();

          return lines.filter(s => !!s).join("\n")
        }).join("\n\n");

        evernote.content = entities.encode(contentText)
            .replace(/\b/g, "")
            .replace(/\n/g, "<br>") + "<br>";

        return userClient.updateNote(evernote);
      });
    }).doOnNext((note:Evernote.Note) => {
      res.completedIds.push(note.guid);
    });
  }
}