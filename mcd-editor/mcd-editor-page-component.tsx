import * as Colors from "../common-styles/colors";
import * as React from "react";
import {
  McdEditorAction,
  ReturnToSummary,
  DeleteTerm,
  CommitNote,
  CancelNote,
  SelectTextCell,
  EditTermHint,
  EditTermDetails,
  EditTermClozes,
  FinishEditingTerm, EditTermLanguage, EditTermVoiceUrl, EditTermFlipSpeak
} from "./mcd-editor-actions";
import {McdEditorState} from "./mcd-editor-state";
import {backgroundLayer} from "../common-styles/layouts";
import {tap} from "../utils/obj";
import {CSSProperties} from "../css-properties/css-properties";
import * as css from "../css-properties/css-properties";
import {simpleInput} from "../common-styles/inputs";

export interface McdEditorPageProps {
  onAction:(action:McdEditorAction)=>void
  editorState:McdEditorState
}

var termContainerStyles = {
  textAlign: css.TextAlign.CENTER,
  fontSize: css.Pixels.of(22),
  lineHeight: 1.3
} as CSSProperties;

var itemStyles = {
  paddingLeft: css.Pixels.of(6),
  paddingRight: css.Pixels.of(6),
} as CSSProperties;

var inputGroup = {
  paddingTop: css.Pixels.of(15),
  lineHeight: 1.3
} as CSSProperties;

var inputStyles = simpleInput(css.Percentage.of(90));

var detailsStyles = tap(simpleInput(css.Percentage.of(90)))((s:CSSProperties) => {
});

var checkboxStyles = tap({} as CSSProperties)((s:CSSProperties) => {
  s.marginLeft = css.Pixels.of(8);
  s.backgroundColor = Colors.BG;
  s.verticalAlign = css.VerticalAlign.MIDDLE;
});

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

var selectSpanStyles = tap({} as CSSProperties)((s:CSSProperties) => {
  s.borderRadius = css.Pixels.of(6);
  s.backgroundColor = Colors.OLD_PEA;
  s.boxShadow = new css.BoxShadow(Colors.DEAR_OLD_TEDDY, css.Pixels.of(4), css.Pixels.of(4));
  s.fontWeight = "bold";
});

var termSpanStyles = tap({} as CSSProperties)((s:CSSProperties) => {
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

  inputActionHandler<T extends McdEditorAction>(klass:{new(v:string):T}) {
    return (e:React.SyntheticEvent) => {
      e.stopPropagation();
      this.props.onAction(new klass((e.target as any).value));
    }
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
        <a href="#" onClick={this.actionHandler(new FinishEditingTerm())}> Finish</a>
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
    var termState = this.props.editorState.termState;
    return <div style={termContainerStyles}>
      <div>
        <span style={itemStyles}>Term: {termState.editing.original}</span>
        <span style={itemStyles}>Marker: {termState.editing.marker}</span>
      </div>

      <div style={inputGroup}>
        Hint
        <div>
          <input type="text" style={inputStyles}
                 onChange={this.inputActionHandler(EditTermHint)}
                 value={termState.editing.hint}/>
        </div>
      </div>

      <div style={inputGroup}>
        Details
        <div>
          <textarea
            rows={3}
            style={detailsStyles}
            onChange={this.inputActionHandler(EditTermDetails)}
            value={termState.editing.details}/>
        </div>
      </div>

      <div style={inputGroup}>
        Clozes <a href="#" onClick={this.actionHandler(new EditTermClozes(""))}>Clear</a>
        <div>
          <input type="text" style={inputStyles}
                 onChange={this.inputActionHandler(EditTermClozes)}
                 value={termState.clozes.join(",")}/>
        </div>
      </div>

      <div style={inputGroup}>
        Language
        <div>
          <select value={termState.language || ""}
                  onChange={this.inputActionHandler(EditTermLanguage)}
                  style={inputStyles}>
            <option value="">Unknown</option>
            <option value="ja-JP">Japanese</option>
            <option value="zh-HK">Cantonese</option>
          </select>
        </div>

        {this.renderSpeakIt()}
      </div>

      <div>
        {this.renderDictionaries()}
      </div>
    </div>;
  }

  renderSpeakIt() {
    if (this.props.editorState.termState.language) {
      return <div>
        <div style={inputGroup}>
          Speak It
          <input type="checkbox" style={checkboxStyles}
                 onChange={this.actionHandler(new EditTermFlipSpeak())}
                 checked={this.props.editorState.termState.speakIt}/>
        </div>
        <div style={inputGroup}>
          <input type="text" style={inputStyles}
                 onChange={this.inputActionHandler(EditTermVoiceUrl)}
                 value={this.props.editorState.termState.voiceUrl}/>
        </div>
      </div>
    }
    return <div></div>;
  }

  renderDictionaries() {
    if (this.props.editorState.termState.language === "ja-JP") {
      var original = this.props.editorState.termState.editing.original;
      return <div style={inputGroup}>
        <div>
          <a style={itemStyles} target="_new"
             href={"http://jisho.org/search/" + original}>Jisho</a>
          <a style={itemStyles} target="_new"
             href={`http://www.sanseido.net/User/Dic/Index.aspx?TWords=${original}&st=0&DORDER=&DailyJJ=checkbox&DailyEJ=checkbox&DailyJE=checkbox`}>
            Sanseido
          </a>
        </div>
      </div>
    }
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
          characterSpans.push(<br key={"" + j}/>);
        } else {
          characterSpans.push(<span key={"" + j}
                                    onClick={this.actionHandler(new SelectTextCell(i, j))}
                                    style={characterSpanStyles}>{character}</span>)
        }
      }

      if (region[1] != null) {
        spans.push(<span key={noteState.note.id + "-" + i}
                         style={termSpanStyles}>{characterSpans}</span>);
      } else {
        if (termState.selectedRegion === i) {
          spans.push(<span key={noteState.note.id + "-" + i + "1"}>
            {characterSpans.slice(0, termState.selectedRegionIdx)}
            </span>);
          spans.push(<span style={selectSpanStyles}
            key={noteState.note.id + "-" + i + "2"}>{characterSpans[termState.selectedRegionIdx]}</span>);
          spans.push(<span key={noteState.note.id + "-" + i + "3"}>{characterSpans.slice(
            termState.selectedRegionIdx + 1)}</span>);
        } else {
          spans.push(<span key={noteState.note.id + "-" + i}>{characterSpans}</span>);
        }
      }
    }

    return <div>
      {spans}
    </div>;
  }
}
