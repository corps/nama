import * as React from "react";
import { component } from "../cycle-rx-utils/components";
import * as Rx from "rx-lite";
import { LandingPage } from "./landing-page-component";
import { SummaryPage } from "./summary-page-component";
import { ErrorPage } from "./error-page-component";
import { main } from "../cycle-rx-utils/bundles";
import { tap } from "../utils/obj";
import {FrontendAppState} from "../frontend-app-state-machine/frontend-app-state";
import {FrontendAppStateMachine} from "../frontend-app-state-machine/frontend-app-state-machine";
import {ClientSession} from "../sessions/session-model";
import {StudyPage} from "./study-page-component";
import {Note} from "../study-model/note-model";
import {ScheduledClozeIdentifier} from "../api/api-models";
import {Term} from "../study-model/note-model";
import {Cloze} from "../study-model/note-model";
import {ClozeIdentifier} from "../study-model/note-model";
import {buildLongNote} from "./demo-notes";
import {buildImageResource} from "./demo-notes";

interface HasChildren {
  children?: React.ReactNode[]
}

class DesktopViewport extends React.Component<HasChildren, any> {
  render() {
    return <div className="force-desktop"
                style={{ position: "relative", border: "1px solid black", overflowY: "scroll", height: "600px", width: "800px" }}>
      {this.props.children}
    </div>
  }
}

class MobileViewport extends React.Component<HasChildren, any> {
  render() {
    return <div className="force-mobile"
                style={{ position: "relative", border: "1px solid black", overflowY: "scroll", height: "568px", width: "320px" }}>
      {this.props.children}
    </div>
  }
}

export var PagesTest = component<{}>("PagesTest",
  (interactions, prop$) => {
    var stateEngine = new FrontendAppStateMachine(interactions,
      tap(new FrontendAppState())((initialState:FrontendAppState) => {
        initialState.clientSession.loggedInUserId = 2;
        initialState.clientSession.userName = "John";
        var note = buildLongNote();
        initialState.scheduledStudy.notes[note.id] = note;
        for (var i = 0; i < 40; ++i) {
          if (i % 2 == 0) {
            initialState.scheduledStudy.scheduledClozes.push(
              tap(new ScheduledClozeIdentifier())(
                ci => ci.clozeIdentifier =
                  ClozeIdentifier.of(note, note.terms[0], note.terms[0].clozes[0])));
          } else {
            initialState.scheduledStudy.scheduledClozes.push(
              tap(new ScheduledClozeIdentifier())(
                ci => ci.clozeIdentifier =
                  ClozeIdentifier.of(note, note.terms[1], note.terms[1].clozes[0])));
          }
        }
        initialState.images =
          [buildImageResource(note, "image1"), buildImageResource(note, "image2")];
      }));

    stateEngine.loadClientSession.onNext(tap(new ClientSession())(s => {
      s.loggedInUserId = 10;
      s.userName = "discomonger";
    }));
    return stateEngine.appState$.map((appState) => {
      var summaryPage = <SummaryPage appState={appState}
                                     onNewFilter={stateEngine.addFilter.listener}
                                     onFilterChange={stateEngine.changeFilter.listener}
                                     onBeginStudying={stateEngine.beginStudy.listener}
                                     onQueueMaxChange={stateEngine.changeQueueMax.listener}/>;
      var studyPage = <StudyPage appState={appState}
                                 onFinishStudy={null}
                                 onRequestImageIds={null}
                                 onAnswer={stateEngine.answerCard.listener}
                                 onShowHide={stateEngine.showHideAnswer.listener}/>;
      return <div>
        <DesktopViewport>
          <LandingPage/>
        </DesktopViewport>
        <MobileViewport>
          <LandingPage/>
        </MobileViewport>
        <DesktopViewport>
          {summaryPage}
        </DesktopViewport>
        <MobileViewport>
          {summaryPage}
        </MobileViewport>
        <DesktopViewport>
          {studyPage}
        </DesktopViewport>
        <MobileViewport>
          {studyPage}
        </MobileViewport>
        <DesktopViewport>
          <ErrorPage failureKanji="未検出" explanation="Looks like that page doesn't exist!"/>
        </DesktopViewport>
        <MobileViewport>
          <ErrorPage failureKanji="未検出" explanation="Looks like that page doesn't exist!"/>
        </MobileViewport>
      </div>;
    });
  });

main(() => {
  return <div>
    <PagesTest></PagesTest>
  </div>;
});

