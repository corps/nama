export interface ImportCloze {
  cloze:string
  due_at:number
  last_answered:number
  interval:number
}

export interface ImportTerm {
  term:string
  marker:string
  answer_details:string
  clozes:ImportCloze[]
}

export interface ImportMaterial {
  content: string
  terms: ImportTerm[]
  language: string
}