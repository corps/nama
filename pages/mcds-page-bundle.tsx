import {main} from "../cycle-rx-utils/bundles";
import {McdEditorPageComponent} from "../mcd-editor/mcd-editor-page-component";
import * as React from "react";
import {component} from "../cycle-rx-utils/components";
import {FrontendAppStateMachine} from "../frontend-app-state-machine/frontend-app-state-machine";
import {FrontendAppState} from "../frontend-app-state-machine/frontend-app-state";

export var McdEditorPageComponentTest = component<{}>("McdEditorPageComponentTest",
  (interactions, prop$) => {
    var initialState = new FrontendAppState();
    var stateMachine = new FrontendAppStateMachine(interactions, initialState);

    stateMachine.requestLoadMcds.subject.subscribe(() => console.log("requesting load mcds"));
    stateMachine.requestSync.subject.subscribe(() => console.log("requesting sync"));

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