import {Term} from "../study-model/note-model";
export class SelectTextCell {
  selectTextCell = true;

  constructor(public region: number, public regionIdx: number) {
  }
}

export class ReturnToSummary {
  returnToSummary = true;
}

export class CommitTerm {
  commitTerm = true;
}

export class CancelEditingTerm {
  cancelEditingTerm = true;
}

export class DeleteTerm {
  deleteTerm = true;
}

export class CommitNote {
  commitNote = true;
}

export class CancelNote {
  cancelNote = true;
}

export class OpenTerm {
  openTerm = true;

  constructor(public term: Term) {
  }
}

type TermAction =  CommitTerm | CancelEditingTerm | DeleteTerm | OpenTerm;
type NoteAction = CommitNote | CancelNote;
export type McdEditorAction = SelectTextCell | ReturnToSummary | TermAction | NoteAction;