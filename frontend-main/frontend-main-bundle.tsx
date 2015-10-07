import * as React from "react";
import * as Rx from "rx-lite";
import { main } from "../cycle-rx-utils/bundles";
import * as state from "../frontend-app-state-machine/frontend-app-state";
import { FrontendMainComponent } from "./frontend-main-component";
import { FrontendAppStateMachine } from "../frontend-app-state-machine/frontend-app-state-machine";
import {FrontendServices} from "../frontend-services/frontend-services";
import {component} from "../cycle-rx-utils/components";

export var prerender = <div>
  <FrontendMainComponent appState={new state.FrontendAppState()}/>
</div>;

var FrontendMain = component<{}>("FrontendMain", (interactions, props) => {
  var StateMachine:typeof FrontendAppStateMachine = require(
    "../frontend-app-state-machine/frontend-app-state-machine")
    .FrontendAppStateMachine;
  var stateMachine = new StateMachine(interactions) as FrontendAppStateMachine;
  new FrontendServices().connect(stateMachine);

  return stateMachine.appState$.map(appState => <div>
    <FrontendMainComponent appState={appState} stateMachine={stateMachine}/>
  </div>);
});

main(() => {
  return <FrontendMain/>;
});
