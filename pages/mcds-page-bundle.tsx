import {main} from "../cycle-rx-utils/bundles";
import {McdEditorPageComponent} from "../mcd-editor/mcd-editor-page-component";
import * as React from "react";
import {component} from "../cycle-rx-utils/components";
import {FrontendAppStateMachine} from "../frontend-app-state-machine/frontend-app-state-machine";
import {FrontendAppState} from "../frontend-app-state-machine/frontend-app-state";
import {LocalMcdState, LocalMcdStorage} from "../local-storage/local-mcd-storage";
import {buildShortNote, buildLongNote, buildSpeakNote} from "./demo-notes";
import {tap} from "../utils/obj";
import {focus$} from "../frontend-services/pagefocus-rx";
import {FrontendServices} from "../frontend-services/frontend-services";
import {LocalStorage} from "../local-storage/local-storage";
import {LocalSettingsStorage} from "../local-storage/local-settings-storage";
import {ClientSession} from "../sessions/session-model";
import {login} from "../sessions/fronted-session";

export var McdEditorPageComponentTest = component<{}>("McdEditorPageComponentTest",
  (interactions, prop$) => {
    var initialState = new FrontendAppState();

    var clientSession = new ClientSession();
    clientSession.loggedInUserId = 3;
    clientSession.sessionXsrfToken = "asdf";
    login(clientSession);

    var stateMachine = new FrontendAppStateMachine(interactions, initialState);
    var services = new FrontendServices();

    var localStorage = new LocalStorage(window.localStorage);
    var settingsStorage = new LocalSettingsStorage(localStorage, () => null);


    var mcdStorage = new LocalMcdStorage(localStorage, settingsStorage);
    (window as any).mcdStorage = mcdStorage;

    stateMachine.requestLoadMcds.subject.subscribe(() => {
      var state = mcdStorage.getState();
      if (state.queue.length == 0) {
        state.queue = [buildLongNote(), buildSpeakNote()];
        mcdStorage.writeState(state);
      }
    });

    services.connect(stateMachine);

    setTimeout(() => {
      stateMachine.visitMcds.listener(null);
    }, 1000)

    return stateMachine.appState$.map((s:FrontendAppState) => {
      console.log("next state", s.mcdEditor);

      return <McdEditorPageComponent
        editorState={s.mcdEditor}
        onAction={stateMachine.mcdEditorAction.listener}/>;
    });
  });

main(() => {
  return <McdEditorPageComponentTest/>
})