import {arrayOf} from "../model-helpers/model-helpers";
import {Note, Term} from "../study-model/note-model";
import {LocalMcdState} from "../local-storage/local-mcd-storage";

export class McdEditorNoteState {
  textWithoutAnnotations = "";
  ranges = [] as [number, Term][];
  note = new Note();
  edited = false;
}

export class McdEditorTermState {
  editing = new Term();
  language = "";
  speakIt = false;
}

export class McdEditorState {
  noteState = new McdEditorNoteState();
  termState = new McdEditorTermState();
  loaded = false;
  editingTerm = false;
}
