import * as React from "react";
import {McdEditorAction} from "./mcd-editor-actions";
import {McdEditorState} from "./mcd-editor-state";
import {backgroundLayer} from "../common-styles/layouts";

export interface McdEditorPageProps {
  onAction:(action:McdEditorAction)=>void
  editorState:McdEditorState
}

export class McdEditorPageComponent extends React.Component<McdEditorPageProps, {}> {
  render() {
    return <div>

    </div>;
  }
}
