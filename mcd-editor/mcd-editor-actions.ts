export class SelectTextCell {
  selectTextCell = true;

  constructor(public region:number, public regionIdx:number) {
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

type TermAction =  CommitTerm | CancelEditingTerm | DeleteTerm;
type NoteAction = CommitNote | CancelNote;
export type McdEditorAction = SelectTextCell | ReturnToSummary | TermAction | NoteAction;