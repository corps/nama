import * as React from "react";
import { component } from "../cycle-rx-utils/components";
import * as Rx from "rx-lite";
import {main} from "../cycle-rx-utils/bundles";
import {StudyCard} from "./study-card-component";
import {backgroundLayer} from "../common-styles/layouts";
import {buildLongNote} from "./demo-notes";
import {ClozeIdentifier} from "../study-model/note-model";
import {buildImageResource} from "./demo-notes";

var background = backgroundLayer();

export var StudyCardTest = component<{}>("StudyCardtest", (interactions, prop$) => {
  var openInteraction = interactions.interaction<boolean>();
  //var answering$ = answeringInteraction.subject.scan<boolean>(isAnswering => !isAnswering, false).startWith(false);
  var note = buildLongNote();

  return openInteraction.subject.startWith(false).map((isOpen) => {
    var clozeIdentifier = ClozeIdentifier.of(note, note.terms[0], note.terms[0].clozes[0]);
    return <div style={background}>
      <StudyCard note={note} clozeIdentifier={clozeIdentifier} isOpen={isOpen}
                 onRequestOpen={openInteraction.listener}/>
    </div>
  });
});

main(() => {
  return <div>
    <StudyCardTest></StudyCardTest>
  </div>;
});
