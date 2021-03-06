import * as React from "react";
import {component} from "../cycle-rx-utils/components";
import {CSSProperties} from "../css-properties/css-properties";
import {tap} from "../utils/obj";
import * as css from "../css-properties/css-properties";
import {backgroundLayer} from "../common-styles/layouts";
import {FrontendAppState} from "../frontend-app-state-machine/frontend-app-state";
import {assign} from "../utils/obj";
import {StudyCard} from "./study-card-component";
import {shortcutKeyStyles} from "../common-styles/layouts";
import {onlyMobileStyleName} from "../inline-assets/inline-layout-styles";

var topContainerStyles = tap({} as CSSProperties)((s:CSSProperties) => {
  s.textAlign = css.TextAlign.CENTER;
  assign(s, backgroundLayer());
});

var desktopCardContainer = tap({} as CSSProperties)((s:CSSProperties) => {
  s.width = css.Pixels.of(650);
  s.height = css.Pixels.of(500);
  s.marginLeft = css.AUTO;
  s.marginRight = css.AUTO;
  s.marginTop = css.Pixels.of(20);
  s.marginBottom = css.Pixels.of(15);
});

var mobileCardContainer = tap({} as CSSProperties)((s:CSSProperties) => {
  s.height = css.Percentage.of(100);
  s.width = css.Percentage.of(100);
});

var shortcutHintBlockStyles = tap({} as CSSProperties)((s:CSSProperties) => {
  s.fontSize = 18;
  s.marginBottom = css.Pixels.of(5);
});

export interface StudyPageProps {
  appState:FrontendAppState
  onShowHide:(e:boolean) => void
  onAnswer:(e:number) => void
  onRequestImageIds:(ids:string[]) => void
  onFinishStudy:(e:any) => void
}

export var StudyPage = component<StudyPageProps>("Study", (interactions, prop$) => {
  var showHideInteraction = interactions.interaction<boolean>();
  var answerInteraction = interactions.interaction<number>();
  var finishStudyInteraction = interactions.preventDefaultInteraction();

  var showHide$ = showHideInteraction.subject;
  var answer$ = answerInteraction.subject;

  return {
    view: prop$.map((props:StudyPageProps) => {
      var study = props.appState.scheduledStudy;

      var numInQueue = study.scheduledClozes.length;
      var clozeId = study.scheduledClozes[props.appState.curStudyIdx].clozeIdentifier;
      var note = study.notes[clozeId.noteId];

      var card = <StudyCard onAnswer={answerInteraction.listener}
                            onRequestOpen={showHideInteraction.listener}
                            isOpen={props.appState.isAnswering}
                            note={note}
                            clozeIdentifier={clozeId}/>;

      var images = props.appState.images.map(image => <div>
        <img key={image.id}
             src={`data:${image.contentType};base64,${image.b64Data}`}/>
      </div>);

      return <div style={topContainerStyles}>
        <div className="only-desktop">
          <div style={desktopCardContainer}>
            {card}
          </div>
          <div style={ shortcutHintBlockStyles }>
            { props.appState.curStudyIdx < numInQueue
              ? <span>Next:&nbsp;
              <span style={shortcutKeyStyles}>j</span>
            </span>
              : null }
            { props.appState.curStudyIdx > 0
              ? <span>&nbsp;Previous:&nbsp;
              <span style={shortcutKeyStyles}>k</span>
            </span>
              : null }
            <span>
              &nbsp;Show/Hide:&nbsp;
              <span style={shortcutKeyStyles}>f</span>
            </span>
            <span>
              &nbsp;Back:&nbsp;
              <span style={shortcutKeyStyles}>r</span>
            </span>
          </div>

          <div>
            This Session: {props.appState.numStudiedCurSession}
            / {props.appState.numStudiedCurSession + numInQueue}
          </div>
          <div className={onlyMobileStyleName}>
            <a href="#" onClick={finishStudyInteraction.listener}>Return to summary</a>
          </div>
          {images}
        </div>
        <div className="only-mobile" style={mobileCardContainer}>
          {card}
        </div>
        <div className="only-mobile">
          <div className={onlyMobileStyleName}>
            <a href="#" onClick={finishStudyInteraction.listener}>Return to summary</a>
          </div>
          {images}
        </div>
      </div>;
    }),
    events: {
      onShowHide: showHide$,
      onAnswer: answer$,
      onRequestImageIds: prop$.map(props => {
        var study = props.appState.scheduledStudy;
        var clozeId = study.scheduledClozes[props.appState.curStudyIdx].clozeIdentifier;
        var note = study.notes[clozeId.noteId];
        return note.findTerm(clozeId);
      }).distinctUntilChanged(a => a, (a, b) => a === b).map(note => note.imageIds),
      onFinishStudy: finishStudyInteraction.subject
    }
  }
});
