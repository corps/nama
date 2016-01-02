import * as React from "react";
import { component } from "../cycle-rx-utils/components";
import * as Rx from "rx-lite";
import {main} from "../cycle-rx-utils/bundles";
import {StudyCard} from "./study-card-component";
import {backgroundLayer} from "../common-styles/layouts";
import {buildLongNote} from "./demo-notes";
import {ClozeIdentifier} from "../study-model/note-model";
import {buildImageResource} from "./demo-notes";
import {buildShortNote} from "./demo-notes";
import {Note} from "../study-model/note-model";

var background = backgroundLayer();

export var StudyCardTest = component<{}>("StudyCardtest", (interactions, prop$) => {
  var openInteraction = interactions.interaction<boolean>();
  var changeNoteInteraction = interactions.interaction<any>();
  var note = buildLongNote();
  var note2 = buildShortNote();
  var isOpen$ = openInteraction.subject.startWith(false);
  var note$ = changeNoteInteraction.subject.scan<number>(count => count + 1, 0).startWith(0)
    .map(c => c % 2 === 0 ? note : note2).doOnNext(() => openInteraction.listener(false));

  var state$ = isOpen$.combineLatest<Note, [boolean, Note]>(note$, (o, n) => [o, n]);

  return state$.map(([isOpen, note]) => {
    var clozeIdentifier = ClozeIdentifier.of(note, note.terms[0], note.terms[0].clozes[0]);
    return <div style={background}>
      <StudyCard note={note} clozeIdentifier={clozeIdentifier} isOpen={isOpen}
                 onAnswer={changeNoteInteraction.listener}
                 onRequestOpen={openInteraction.listener}/>
    </div>
  });
});

main(() => {
  return <div>
    <StudyCardTest></StudyCardTest>
  </div>;
});
