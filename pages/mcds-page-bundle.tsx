import {main} from "../cycle-rx-utils/bundles";
import {McdEditorPageComponent} from "../mcd-editor/mcd-editor-page-component";
import * as React from "react";
import {component} from "../cycle-rx-utils/components";
import {FrontendAppStateMachine} from "../frontend-app-state-machine/frontend-app-state-machine";
import {FrontendAppState} from "../frontend-app-state-machine/frontend-app-state";
import {LocalMcdState} from "../local-storage/local-mcd-storage";
import {buildShortNote, buildLongNote, buildSpeakNote} from "./demo-notes";
import {tap} from "../utils/obj";
import {focus$} from "../frontend-services/pagefocus-rx";

export var McdEditorPageComponentTest = component<{}>("McdEditorPageComponentTest",
  (interactions, prop$) => {

    var localMcds = [
      tap(new LocalMcdState())((s:LocalMcdState) => {
        s.queue = [buildShortNote(), buildLongNote()];
      }),
      tap(new LocalMcdState())((s:LocalMcdState) => {
        s.queue = [buildShortNote(), buildLongNote()];
        s.edited = true;
      }),
      tap(new LocalMcdState())((s:LocalMcdState) => {
        s.queue = [buildLongNote()];
      }),
      tap(new LocalMcdState())((s:LocalMcdState) => {
        s.queue = [buildSpeakNote()];
      }),
      tap(new LocalMcdState())((s:LocalMcdState) => {
        s.queue = [];
      }),
    ];

    var initialState = new FrontendAppState();
    var stateMachine = new FrontendAppStateMachine(interactions, initialState);

    var count = 0;
    stateMachine.requestLoadMcds.subject.subscribe(() => {
      stateMachine.finishLoadingMcds.listener(localMcds[count % localMcds.length]);
      count++;
    });

    focus$.subscribe(() => {
      console.log("focused");
      stateMachine.requestLoadMcds.subject.onNext(null);
    });

    stateMachine.requestLoadMcds.subject.onNext(null);

    return stateMachine.appState$.map((s:FrontendAppState) => {
      console.log("next state", s);

      return <McdEditorPageComponent
        editorState={s.mcdEditor}
        onAction={stateMachine.mcdEditorAction.listener}/>;
    });
  });

main(() => {
  return <McdEditorPageComponentTest/>
})