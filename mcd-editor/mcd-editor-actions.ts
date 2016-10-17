import {Term} from "../study-model/note-model";
export class SelectTextCell {
  selectTextCell = true;

  constructor(public region: number, public regionIdx: number) {
  }
}

export class EditTermHint {
  editTermHint = true;

  constructor(public value: string) {
  }
}

export class EditTermClozes {
  editTermClozes = true;

  constructor(public value: string) {
  }
}

export class EditTermLanguage {
  editTermLanguage = true;

  constructor(public value: string) {
  }
}

export class EditTermVoiceUrl {
  editTermVoiceUrl = true;

  constructor(public value: string) {
  }
}

export class EditTermDetails {
  editTermDetails = true;

  constructor(public value: string) {
  }
}
export class ReturnToSummary {
  returnToSummary = true;
}

export class FinishEditingTerm {
  finishEditing = true;
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

export class EditTermFlipSpeak {
  editTermFlipSpeak = true;
}

export class EditTermFlipTrainSpeaking {
  editTermFlipTrainSpeaking = true;
}

export type TermAction =  EditTermFlipTrainSpeaking | FinishEditingTerm | DeleteTerm | OpenTerm | EditTermHint | EditTermLanguage
  | EditTermDetails | EditTermClozes | EditTermVoiceUrl | EditTermFlipSpeak ;
export type NoteAction = CommitNote | CancelNote;
export type McdEditorAction = SelectTextCell | ReturnToSummary | TermAction | NoteAction;