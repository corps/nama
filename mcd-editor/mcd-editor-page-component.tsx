import * as React from "react";
import {Action} from "./mcd-editor-actions";
import {McdEditorState} from "./mcd-editor-state";
import {backgroundLayer} from "../common-styles/layouts";

export interface McdEditorPageProps {
  reducer:(action:Action, state?:McdEditorState)=>McdEditorState
}

export interface McdEditorState {
  lastState:McdEditorState,
  currentState:McdEditorState
}

export class McdEditorPageComponent extends React.Component<McdEditorPageProps, McdEditorState> {
  state = new McdEditorState();

  render() {
    return <div>

    </div>;
  }
}
