import {arrayOf} from "../model-helpers/model-helpers";
import {Note, Term} from "../study-model/note-model";

export enum McdEditorView { NOTE_VIEW, TERM_VIEW };

export class McdEditorState {
  noteTextWithoutAnnotations = "";
  markerRanges = [] as [number, number, string];
  committedNotes = arrayOf(Note);
  editingNote = new Note();
  editedNote = false;
  editableNotes = arrayOf(Note);
  editingTerm = new Term();
  editingTermLanguage = "";
  currentView = McdEditorView.NOTE_VIEW;
}