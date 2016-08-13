export class SelectTextCell {
  constructor(public idx:number) {
  }
}

export class ReturnToSummary {
  returnToSummary = true;
}

export type McdEditorAction = SelectTextCell | ReturnToSummary;