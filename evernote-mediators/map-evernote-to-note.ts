import {Evernote} from "evernote";
import {Note} from "../study-model/note-model";
import {NoteContentsMapper} from "./note-contents-mapper";
import {tap} from "../utils/obj";

export function mapEvernoteToNote(evernote:Evernote.Note) {
  var contentMapper = new NoteContentsMapper(evernote.content);
  contentMapper.map();
  return tap(contentMapper.note)((note:Note) => {
    note.id = evernote.guid;
    if (evernote.attributes.placeName || evernote.attributes.latitude) {
      note.location =
        evernote.attributes.placeName
        || evernote.attributes.latitude.toPrecision(10) + ","
        + evernote.attributes.longitude.toPrecision(10);
    }
    note.sourceURL = evernote.attributes.sourceURL || "";
    note.version = evernote.updateSequenceNum;
    for (var term of note.terms) {
      var newImageIds = [] as string[];
      for (var imageHash of term.imageIds) {
        for (var resource of evernote.resources) {
          if (resource.data.bodyHash === imageHash) {
            newImageIds.push(resource.guid);
            break;
          }
        }
      }

      term.imageIds = newImageIds;
    }
  });
}
