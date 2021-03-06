import {arrayOf} from "../model-helpers/model-helpers";
import {Note, Term} from "../study-model/note-model";

export class McdEditorNoteState {
  textWithoutAnnotations = "";
  regions = [] as [number, Term][];
  note = new Note();
  edited = false;
}

export class McdEditorTermState {
  editing = new Term();
  language = "";
  voiceUrl = "";
  speakIt = false;
  trainSpeaking = false;
  clozes = [] as string[];
  selectedRegion = -1;
  selectedRegionIdx = -1;
}

export class McdEditorState {
  queue = arrayOf(Note);
  noteState = new McdEditorNoteState();
  termState = new McdEditorTermState();
  loaded = false;
  editingTerm = false;
}
