import * as Colors from "../common-styles/colors";
import * as React from "react";
import {
  McdEditorAction, ReturnToSummary, CommitTerm,
  CancelEditingTerm, DeleteTerm, CommitNote, CancelNote, SelectTextCell
} from "./mcd-editor-actions";
import {McdEditorState} from "./mcd-editor-state";
import {backgroundLayer} from "../common-styles/layouts";
import {tap} from "../utils/obj";
import {CSSProperties} from "../css-properties/css-properties";
import * as css from "../css-properties/css-properties";

export interface McdEditorPageProps {
  onAction:(action:McdEditorAction)=>void
  editorState:McdEditorState
}

var characterSpanStyles = tap({} as CSSProperties)((s => {
  s.fontSize = css.Pixels.of(20);
  s.lineHeight = 1.1;
  s.display = css.Display.INLINE_BLOCK;
  s.width = css.Pixels.of(24);
  s.textAlign = css.TextAlign.CENTER;
  // s.width = css.Pixels.of(0);
  // s.paddingLeft = css.Pixels.of(11);
  // s.paddingRight = css.Pixels.of(11);
}));

var selectedSpanStyles = tap({} as CSSProperties)((s:CSSProperties) => {
  s.borderRadius = css.Pixels.of(6);
  s.backgroundColor = Colors.YORK_OLD;
  s.boxShadow = new css.BoxShadow(Colors.DEAR_OLD_TEDDY, css.Pixels.of(4), css.Pixels.of(4));
  s.fontWeight = "bold";
});

var barStyle = tap({} as CSSProperties)((s) => {
  s.position = css.Position.FIXED;
  s.top = css.Pixels.of(0);
  s.left = css.Pixels.of(0);
  s.width = css.Percentage.of(100);
  s.paddingBottom = css.Pixels.of(6);
  s.textAlign = css.TextAlign.CENTER;
  s.backgroundColor = Colors.BG;
});

var containerStyles = tap({} as CSSProperties)((s) => {
  s.paddingLeft = css.Pixels.of(10);
  s.paddingTop = css.Pixels.of(46);
  s.paddingRight = css.Pixels.of(10);
  s.paddingBottom = css.Pixels.of(30);
  s.maxWidth = css.Pixels.of(600);
  s.marginLeft = css.AUTO;
  s.marginRight = css.AUTO;
});

// -- Next Return
// -- Commit Cancel Return
// -- Commit Cancel Delete

export class McdEditorPageComponent extends React.Component<McdEditorPageProps, {}> {
  render() {
    return <div style={backgroundLayer()}>
      <div>
        <div style={containerStyles}>
          <div style={barStyle}>
            <div className="only-desktop" style={{ marginTop: 50 }}>
            </div>
            {this.renderBar()}
          </div>
          <div className="only-desktop" style={{ marginTop: 50 }}>
          </div>
          {this.renderInner()}
        </div>
      </div>
    </div>;
  }

  actionHandler(action:McdEditorAction) {
    return (e:React.SyntheticEvent) => {
      e.preventDefault();
      e.stopPropagation();
      this.props.onAction(action);
    }
  }

  renderBar() {
    var returnLink = <a href="#" onClick={this.actionHandler(new ReturnToSummary())}> Return</a>;

    if (!this.props.editorState.loaded) {
      return <div>{returnLink}</div>
    }

    if (this.props.editorState.editingTerm) {
      return <div>
        <a href="#" onClick={this.actionHandler(new CommitTerm())}> Commit</a>
        <a href="#" onClick={this.actionHandler(new CancelEditingTerm())}> Cancel</a>
        <a href="#" onClick={this.actionHandler(new DeleteTerm())}> Delete</a>
      </div>
    }

    if (this.props.editorState.noteState.edited) {
      return <div>
        <a href="#" onClick={this.actionHandler(new CommitNote())}> Commit</a>
        <a href="#" onClick={this.actionHandler(new CancelNote())}> Cancel</a>
        {returnLink}
      </div>
    }

    return <div>
      <a href="#" onClick={this.actionHandler(new CancelNote())}> Next</a>
      {returnLink}
    </div>
  }

  renderInner() {
    if (!this.props.editorState.loaded) {
      return <div style={{ textAlign: css.TextAlign.CENTER }}>
        Not loaded.
      </div>
    }

    if (this.props.editorState.editingTerm) {
      return this.renderTermEditor();
    } else {
      return this.renderTextSelector();
    }
  }

  renderTermEditor() {
    return <div>
    </div>;
  }

  renderTextSelector() {
    var spans = [] as React.ReactNode[];
    var noteState = this.props.editorState.noteState;
    var termState = this.props.editorState.termState;
    var regions = noteState.regions;
    var idx = 0;

    for (let i = 0; i < regions.length; ++i) {
      var region = regions[i];

      var characterSpans = [] as React.ReactNode[];
      for (let j = 0; j < region[0]; ++j) {
        var character = noteState.textWithoutAnnotations[idx++];
        if (character === "\n") {
          characterSpans.push(<br/>);
        } else {
          characterSpans.push(<span key={"" + j}
                                    onClick={this.actionHandler(new SelectTextCell(i, j))}
                                    style={characterSpanStyles}>{character}</span>)
        }
      }

      if (region[1] != null) {
        spans.push(<span key={noteState.note.id + "-" + i}
                         style={selectedSpanStyles}>{characterSpans}</span>);
      } else {
        if (termState.selectedRegion === i) {
          spans.push(<span>{characterSpans.slice(0, termState.selectedRegionIdx)}</span>);
          spans.push(<span>{characterSpans[termState.selectedRegionIdx]}</span>);
          spans.push(<span>{characterSpans.slice(termState.selectedRegionIdx + 1)}</span>);
        } else {
          spans.push(<span>{characterSpans}</span>);
        }
      }
    }

    return <div>
      {spans}
    </div>;
  }
}
