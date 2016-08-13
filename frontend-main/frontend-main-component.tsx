import * as React from "react";
import * as Rx from "rx-lite";
import {LandingPage} from "../pages/landing-page-component";
import {SummaryPage} from "../pages/summary-page-component";
import {component} from "../cycle-rx-utils/components";
import * as state from "../frontend-app-state-machine/frontend-app-state";
import {FrontendAppState} from "../frontend-app-state-machine/frontend-app-state";
import {FrontendAppStateMachine} from "../frontend-app-state-machine/frontend-app-state-machine";
import {StudyPage} from "../pages/study-page-component";
import {McdEditorPageComponent} from "../mcd-editor/mcd-editor-page-component";

interface Props {
  stateMachine?:FrontendAppStateMachine
  appState:FrontendAppState
}

export var FrontendMainComponent = component<Props>("FrontendMain",
  (interactions, prop$) => {
    var appState$ = prop$.map(({appState}) => appState);
    var stateMachine$ = prop$.map(({stateMachine}) => stateMachine);

    return appState$.combineLatest<FrontendAppStateMachine, [FrontendAppState, FrontendAppStateMachine]>(
      stateMachine$, (appState, stateMachine) => [appState, stateMachine])
      .map(([appState, stateMachine]) => {
        switch (appState.currentPage) {
          case state.CurrentPage.MCDS:
            return <McdEditorPageComponent
              onAction={!!stateMachine ? stateMachine.mcdEditorAction.listener : null }
              editorState={appState.mcdEditor}></McdEditorPageComponent>;
          case state.CurrentPage.LOGGED_OUT:
            return <LandingPage/>;
          case state.CurrentPage.SUMMARY:
            return <SummaryPage
              onNewFilter={!!stateMachine ? stateMachine.addFilter.listener : null}
              onFilterChange={!!stateMachine ? stateMachine.changeFilter.listener : null}
              onQueueMaxChange={!!stateMachine ? stateMachine.changeQueueMax.listener : null}
              onBeginStudying={!!stateMachine ? stateMachine.beginStudy.listener : null}
              onVisitMcds={!!stateMachine ? stateMachine.visitMcds.listener : null}
              onRefresh={!!stateMachine ? stateMachine.requestSync.listener : null}
              appState={appState}/>;
          case state.CurrentPage.STUDYING:
            return <StudyPage
              appState={appState}
              onAnswer={!!stateMachine ? stateMachine.answerCard.listener : null}
              onFinishStudy={!!stateMachine ? stateMachine.visitSummary.listener : null}
              onRequestImageIds={!!stateMachine ? stateMachine.requestImages.listener : null}
              onShowHide={!!stateMachine ? stateMachine.showHideAnswer.listener : null}/>;
        }
      })
  });
