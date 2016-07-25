import * as React from "react";
import {component} from "../cycle-rx-utils/components";
import * as Rx from "rx-lite";
import * as Colors from "../common-styles/colors";
import {CSSProperties} from "../css-properties/css-properties";
import {tap, shallowCopy} from "../utils/obj";
import * as css from "../css-properties/css-properties";
import {Note} from "../study-model/note-model";
import {ClozeIdentifier} from "../study-model/note-model";
import {assign} from "../utils/obj";
import {writingMode} from "../common-styles/layouts";
import {ScrollworkFlourish} from "../scrollwork/scrollwork-flourish-component";
import {ScreenFitVerticalParagraph} from "./screen-fit-vertical-paragraph-component";
import {shortcutKeyStyles} from "../common-styles/layouts";
import {baseButtonStyles} from "../common-styles/inputs";
import {Scheduler} from "../study-model/scheduler";
import moment = require("moment");
import {SyntheticEvent} from "react/addons";
import {isIOS} from "../utils/browser";
import {
  EASY_FACTOR,
  FINE_FACTOR,
  HARD_FACTOR, SKIP_FACTOR
} from "../frontend-app-state-machine/frontend-app-state-machine";
import {render} from "react-dom";
import {speak} from "../voice/voices";

const flourishHeight = 90;
const flourishMargin = 5;
var flourishStyles = {
  maxHeight: css.Pixels.of(flourishHeight),
  maxWidth: css.Pixels.of(350),
} as CSSProperties;

const headerHeight = 40;
var headerStyles = tap({} as CSSProperties)(s => {
  s.height = css.Pixels.of(headerHeight);
  assign(s, writingMode("initial"));
});

var dueAtStyles = tap({} as CSSProperties)((s:CSSProperties) => {
  s.fontSize = css.Pixels.of(15);
});

var answerDetailsBlockStyles = tap({} as CSSProperties)((s:CSSProperties) => {
  s.width = css.Percentage.of(100);
  s.overflowX = "auto";
  s.WebkitOverflowScrolling = "touch";
});

var flourishContainerStyles = tap({} as CSSProperties)((s:CSSProperties) => {
  s.position = css.Position.RELATIVE;
});

var hintContainerStyles = tap({} as CSSProperties)((s:CSSProperties) => {
  s.width = css.Percentage.of(100);
  s.height = css.Percentage.of(100);
  s.position = css.Position.ABSOLUTE;
  s.top = css.Percentage.of(50);
  s.marginTop = css.Pixels.of(-19);
});

var hintBlockStyles = tap({} as CSSProperties)((s:CSSProperties) => {
  s.backgroundColor = Colors.OLD_PAPER;
  s.paddingLeft = css.Pixels.of(6);
  s.paddingRight = css.Pixels.of(6);
  s.borderRadius = css.Pixels.of(6);
  s.borderStyle = "solid";
  s.borderColor = Colors.DEAR_OLD_TEDDY;
  s.fontWeight = "bold";
  s.maxWidth = css.Pixels.of(150);
  s.fontSize = css.Percentage.of(80);
  s.display = css.Display.INLINE_BLOCK;
});

var answerTermStyles = tap({} as CSSProperties)((s:CSSProperties) => {
  s.paddingLeft = css.Pixels.of(16);
  s.paddingRight = css.Pixels.of(16);
  s.marginLeft = css.Pixels.of(10);
  s.marginRight = css.Pixels.of(10);
  s.borderRadius = css.Pixels.of(6);
  s.backgroundColor = Colors.YORK_OLD;
  s.boxShadow = new css.BoxShadow(Colors.DEAR_OLD_TEDDY, css.Pixels.of(4), css.Pixels.of(4));
  s.fontWeight = "bold";
});

var answerClozeStyles = tap({} as CSSProperties)((s:CSSProperties) => {
  s.paddingLeft = css.Pixels.of(16);
  s.paddingRight = css.Pixels.of(16);
  s.marginLeft = css.Pixels.of(10);
  s.marginRight = css.Pixels.of(10);
  s.borderRadius = css.Pixels.of(6);
  s.backgroundColor = Colors.OLD_PEA;
  s.boxShadow = new css.BoxShadow(Colors.DEAR_OLD_TEDDY, css.Pixels.of(4), css.Pixels.of(4));
  s.fontWeight = "bold";
});

var topContainerStyles = tap({} as CSSProperties)((s:CSSProperties) => {
  s.height = css.Percentage.of(100);
  s.width = css.Percentage.of(100);
  s.textAlign = css.TextAlign.CENTER;
  s.overflowX = "hidden";
  s.overflowY = "hidden";
});

var termStyles = tap({} as CSSProperties)((s:CSSProperties) => {
  s.paddingTop = css.Pixels.of(16);
  s.paddingBottom = css.Pixels.of(16);
  s.marginTop = css.Pixels.of(10);
  s.marginBottom = css.Pixels.of(10);
  s.borderRadius = css.Pixels.of(6);
  s.backgroundColor = Colors.YORK_OLD;
  s.boxShadow = new css.BoxShadow(Colors.DEAR_OLD_TEDDY, css.Pixels.of(4), css.Pixels.of(4));
  s.fontWeight = "bold";
});

var clozeStyles = tap({} as CSSProperties)((s:CSSProperties) => {
  assign(s, writingMode("initial"));
  s.fontFamily = "Impact, Charcoal, sans-serif";
});

interface LocalProps {
  preMarker:string
  postMarker:string
  preCloze:string
  postCloze:string
  answerTerm:string
  answerCloze:string
  answerDetailsFirstCharacter:string
  answerDetails:string[]
  props:StudyCardProps
  easyDueAtSecs:number
  fineDueAtSecs:number
  hardDueAtSecs:number
  nowTimeSecs:number
  wasDueAtSecs:number
  hint:string
}

interface LocalState {
  questionContainerSize:ClientRect
  answerContainerSize:ClientRect
  paragraphAdjustment:number
  clozeLeft:number
  answerAdjustment:number
  isOpen:boolean
}

interface StudyCardProps {
  note:Note
  clozeIdentifier:ClozeIdentifier
  onRequestOpen?:(e:boolean)=>void
  isOpen?:boolean
  onAnswer?:(f:number)=>void
}

interface SpeakOptions {
  text:string,
  url?:string,
  lang:string
}

var initialState = {
  questionContainerSize: null as ClientRect,
  answerContainerSize: null as ClientRect,
  paragraphAdjustment: 0,
  clozeLeft: 0,
  answerAdjustment: 0,
  isOpen: false
};

export class StudyCard extends React.Component<StudyCardProps, typeof initialState> {
  state = initialState;
  readyForClozeAdjustment = false;
  resizeSubject = new Rx.Subject<any>();
  onResize = () => this.resizeSubject.onNext(null);
  audioCache = {} as {[k:string]:HTMLAudioElement};

  getAudio = (url:string) => {
    var audioCache = this.audioCache;
    return (audioCache[url] = audioCache[url] || new Audio(url));
  };

  handleOnResize = () => {
    this.adjustParagraph();
  };

  componentDidUpdate(prevProps:StudyCardProps, prevState:typeof initialState) {
    if (prevState.isOpen != this.state.isOpen) {
      this.adjustParagraph();
    }
    else {
      if (this.readyForClozeAdjustment) {
        this.readyForClozeAdjustment = false;
        this.adjustClozePosition();
      }
    }
  }

  clearSelections = () => {
    document.getSelection().removeAllRanges();
  };

  componentDidMount() {
    this.resizeSubject.debounce(200).subscribe(this.handleOnResize);
    window.addEventListener('resize', this.onResize);
    this.adjustParagraph();
  }

  componentWillUnmount() {
    window.removeEventListener('resize', this.onResize);
    this.resizeSubject.onCompleted();
  }

  componentWillReceiveProps(props:StudyCardProps) {
    if (props.onRequestOpen !== null) {
      var nextState = shallowCopy(this.state);
      nextState.isOpen = props.isOpen;
      this.setState(nextState);
    }
  }

  computeClozeProps() {
    var note = this.props.note;
    var clozeId = this.props.clozeIdentifier;
    var term = note.findTerm(clozeId);
    var cloze = term.clozes[clozeId.clozeIdx];
    var answerTerm = term.original;
    var answerCloze = cloze.segment;

    var [preMarker, _, postMarker] = note.termContext(term, 60);
    var [preCloze, _, postCloze] = note.clozeParts(term, cloze);

    var answerCleaned = term.details.replace(/\n\n+/g, "\n").trim();
    var answerDetailsFirstCharacter = answerCleaned[0];
    var answerDetails = answerCleaned.slice(1).split("\n");

    var nowTimeMins = Math.floor(Date.now() / 60000);
    var nowTimeSecs = nowTimeMins * 60;
    var scheduler = new Scheduler();

    var easyDueAtSecs = scheduler
        .nextByFactor(cloze.schedule, EASY_FACTOR, nowTimeMins).dueAtMinutes * 60;
    var fineDueAtSecs = scheduler
        .nextByFactor(cloze.schedule, FINE_FACTOR, nowTimeMins).dueAtMinutes * 60;
    var hardDueAtSecs = scheduler
        .nextByFactor(cloze.schedule, HARD_FACTOR, nowTimeMins).dueAtMinutes * 60;

    var wasDueAtSecs = cloze.schedule.dueAtMinutes * 60;
    var hint = term.hint;

    var speakOptions = null as SpeakOptions;
    if (answerCloze.indexOf("speak:") == 0) {
      var speakParams = answerCloze.split(":");
      speakOptions = {
        text: preMarker + term.original + postMarker,
        lang: speakParams[1],
        url: speakParams.slice(2).join(":")
      }

      answerDetailsFirstCharacter = speakOptions.text[0];
      answerDetails = (speakOptions.text.slice(1) + "\n\n" + answerCleaned).split("\n");
    }

    return {
      preMarker,
      postMarker,
      speakOptions,
      preCloze,
      postCloze,
      answerTerm,
      answerCloze,
      answerDetails,
      answerDetailsFirstCharacter,
      easyDueAtSecs,
      fineDueAtSecs,
      hardDueAtSecs,
      nowTimeSecs,
      wasDueAtSecs,
      hint,
    };
  }

  questionContainer:HTMLElement;
  questionSpan:HTMLElement;
  questionAdjustment:HTMLElement;
  answerContainer:HTMLElement;
  answerSpan:HTMLElement;

  adjustParagraph() {
    var nextState = shallowCopy(this.state);

    if (this.questionContainer) {
      var questionSpanSize = this.questionSpan.getBoundingClientRect();
      var questionContainerSize = this.questionContainer.getBoundingClientRect();
      if (questionContainerSize.width === 0) return;
      var questionAdjustmentSize = this.questionAdjustment.getBoundingClientRect();
      var paragraphAdjustment = questionAdjustmentSize.height;

      nextState.questionContainerSize = questionContainerSize;
      var questionHeight = questionContainerSize.height;
      var verCenterAbsolute = (questionHeight - questionSpanSize.height) / 2;
      var verCenterCur = (questionSpanSize.top - questionContainerSize.top);
      var newAdjustment = (((paragraphAdjustment + (verCenterAbsolute - verCenterCur)) % questionHeight) + questionHeight) % questionHeight;

      nextState.paragraphAdjustment = newAdjustment;
      this.readyForClozeAdjustment = true;
    }

    if (this.answerContainer) {
      var answerContainerSize = this.answerContainer.getBoundingClientRect();
      nextState.answerContainerSize = questionContainerSize;
      var answerSpanSize = this.answerSpan.getBoundingClientRect();

      nextState.answerAdjustment = (answerContainerSize.width - answerSpanSize.width) / 2;
    }

    this.setState(nextState);
  }

  adjustClozePosition() {
    if (this.questionContainer) {
      var questionSpanSize = this.questionSpan.getBoundingClientRect();
      var questionContainerSize = this.questionContainer.getBoundingClientRect();
      var horCenterAbsolute = (questionContainerSize.width - questionSpanSize.width) / 2;
      var horCenterCur = (questionSpanSize.left - questionContainerSize.left);

      var nextState = shallowCopy(this.state);
      nextState.clozeLeft = horCenterAbsolute - horCenterCur;
      this.setState(nextState);
    }
  }

  triggerOpen = () => {
    if (this.props.onRequestOpen) {
      this.props.onRequestOpen(!this.state.isOpen);
    } else {
      var nextState = shallowCopy(this.state);
      nextState.isOpen = !nextState.isOpen;
      this.setState(nextState);
    }
  };

  triggerAnswer = (factor:number) => {
    this.props.onAnswer(factor);
  };

  render() {
    var questionOffsetSpan = tap({} as CSSProperties)(s => {
      var adjustment = this.state.paragraphAdjustment;
      s.height = css.Pixels.of(adjustment);
      s.width = css.Pixels.of(1);
      s.display = css.Display.INLINE_BLOCK;
    });

    var answerDetailsStyles = tap({} as CSSProperties)(s => {
      var adjustment = this.state.answerAdjustment;

      s.marginRight = css.Pixels.of(adjustment);
    });

    var questionContainerStyles = tap({} as CSSProperties)(s => {
      s.width = css.Percentage.of(100);
      s.position = css.Position.RELATIVE;

      s.left = css.Pixels.of(this.state.clozeLeft);
    });

    var computedProps = this.computeClozeProps();

    var audio = null as HTMLAudioElement;
    if (computedProps.speakOptions && computedProps.speakOptions.url) {
      audio = this.getAudio(computedProps.speakOptions.url);
    }

    var describeDueAt = (dueInSecs:number) =>
      moment.duration((dueInSecs - computedProps.nowTimeSecs) * 1000).humanize(true);

    var clozeIdStr = this.props.clozeIdentifier.toString();

    return <div onTouchEnd={() => this.clearSelections()} onMouseUp={() => this.clearSelections()}
                style={topContainerStyles}>
      <div style={headerStyles}>
        { this.state.isOpen && !computedProps.speakOptions
          ? <div>
          <span style={answerTermStyles}>{computedProps.answerTerm}</span>
          ---
          <span style={answerClozeStyles}>{computedProps.answerCloze}</span>
        </div>
          : <div>
          <div>
            was due {describeDueAt(computedProps.wasDueAtSecs)}
          </div>
        </div> }
      </div>
      <div onClick={(e) => { e.preventDefault(); this.triggerOpen(); }}
           onTouchTap={(e) => { e.preventDefault(); this.triggerOpen(); }}>

        <ScreenFitVerticalParagraph
          key={clozeIdStr}
          heightGiven={flourishHeight + flourishMargin + headerHeight}
          style={{ textAlign: css.TextAlign.LEFT }}>
          { this.state.isOpen
            ? <div key="answer" style={answerDetailsBlockStyles}
                   ref={(e) => this.answerContainer = e as any}>
            <div style={answerDetailsStyles}>
              <span ref={(e) => this.answerSpan = e as any}>
                {computedProps.answerDetailsFirstCharacter}
              </span>
              {computedProps.answerDetails.map((d, i) => <span
                key={clozeIdStr + "-" + i}>{d}
                <br/>
              </span>)}
            </div>
          </div>
            : computedProps.speakOptions ? <div key="question" style={questionContainerStyles}
                                                ref={(e) => this.questionContainer = e as any}>
            <div style={questionOffsetSpan} ref={(e) => this.questionAdjustment = e as any}>
            </div>
            <div ref={(e) => this.questionSpan = e as any}
                 style={{ display: css.Display.INLINE_BLOCK }}>
              <button style={assign<any>({}, baseButtonStyles, { display: "inline-block" })}
                      onTouchTap={(e) => { e.preventDefault(); e.stopPropagation(); speak(computedProps.speakOptions.text, computedProps.speakOptions.lang) }}
                      onClick={(e) => { e.preventDefault(); e.stopPropagation();  }}>
                Synth
              </button>

              { audio ?
                <button style={assign<any>({}, baseButtonStyles, { display: "inline-block"})}
                        onTouchTap={(e) => { e.preventDefault(); e.stopPropagation(); audio.play() }}
                        onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                  Audio
                </button> : null }
            </div>
          </div>
            : <div key="question" style={questionContainerStyles}
                   ref={(e) => this.questionContainer = e as any}>
            <div style={questionOffsetSpan} ref={(e) => this.questionAdjustment = e as any}>
            </div>
            {computedProps.preMarker}
            <span style={termStyles}>
              {computedProps.preCloze}
              <span style={clozeStyles} ref={(e) => this.questionSpan = e as any}>
                ?
              </span>
              {computedProps.postCloze}
            </span>
            {computedProps.postMarker}
          </div> }
        </ScreenFitVerticalParagraph>
      </div>
      <div style={{ marginTop: css.Pixels.of(5) }}>
        { this.state.isOpen
          ? <div>
          <button style={baseButtonStyles}
                  onClick={(e:SyntheticEvent) => { e.stopPropagation(); this.triggerAnswer(HARD_FACTOR); }}>
            Hard
            <div className="only-desktop">
              <div style={dueAtStyles}>
                next&nbsp;
                {describeDueAt(computedProps.hardDueAtSecs)}
              </div>
              <div style={shortcutKeyStyles}>a</div>
            </div>
          </button>
          <button style={baseButtonStyles}
                  onClick={(e:SyntheticEvent) => { e.stopPropagation(); this.triggerAnswer(FINE_FACTOR); }}>
            Fine
            <div className="only-desktop">
              <div style={dueAtStyles}>
                next&nbsp;
                {describeDueAt(computedProps.fineDueAtSecs)}
              </div>
              <div style={shortcutKeyStyles}>s</div>
            </div>
          </button>
          <button style={baseButtonStyles}
                  onClick={(e:SyntheticEvent) => { e.stopPropagation(); this.triggerAnswer(EASY_FACTOR); }}>
            Easy
            <div className="only-desktop">
              <div style={dueAtStyles}>
                next&nbsp;
                {describeDueAt(computedProps.easyDueAtSecs)}
              </div>
              <div style={shortcutKeyStyles}>d</div>
            </div>
          </button>
          <button style={baseButtonStyles}
                  onClick={(e:SyntheticEvent) => { e.stopPropagation(); this.triggerAnswer(SKIP_FACTOR); }}>
            Skip
            <div className="only-desktop">
              <div style={dueAtStyles}>
                next in 60 minutes
              </div>
              <div style={shortcutKeyStyles}>v</div>
            </div>
          </button>
        </div>
          : <div style={flourishContainerStyles}>
          <ScrollworkFlourish style={flourishStyles}></ScrollworkFlourish>
          { computedProps.hint
            ? <div style={hintContainerStyles}>
            <div style={hintBlockStyles}>
              { computedProps.hint }
            </div>
          </div>
            : null }
        </div> }
      </div>
    </div >
  }
}
