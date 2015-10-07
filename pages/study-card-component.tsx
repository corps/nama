import * as React from "react";
import { component } from "../cycle-rx-utils/components";
import * as Rx from "rx-lite";
import * as Colors from "../common-styles/colors";
import {CSSProperties} from "../css-properties/css-properties";
import {tap} from "../utils/obj";
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
import {EASY_FACTOR, FINE_FACTOR, HARD_FACTOR} from "../frontend-app-state-machine/frontend-app-state-machine";
import {render} from "react-dom";

const flourishHeight = 90;
const flourishMargin = 20;
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
  s.overflowX = "scroll";
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
  s.textAlign = css.TextAlign.CENTER;
  s.overflowX = "hidden";
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
  preMarker: string
  postMarker: string
  preCloze: string
  postCloze: string
  answerTerm: string
  answerCloze: string
  answerDetailsFirstCharacter: string
  answerDetails:string[]
  props: StudyCardProps
  easyDueAtSecs: number
  fineDueAtSecs: number
  hardDueAtSecs: number
  nowTimeSecs: number
  wasDueAtSecs: number
  hint: string
}

interface LocalState {
  questionContainerSize: ClientRect
  answerContainerSize: ClientRect
  paragraphAdjustment: number
  clozeLeft: number
  answerAdjustment: number
  isOpen: boolean
}

interface StudyCardProps {
  note: Note
  clozeIdentifier: ClozeIdentifier
  onRequestOpen?: (e:any)=>void
  isOpen?: boolean
  onAnswer?: (f:number)=>void
}

export var StudyCard = component<StudyCardProps>("StudyCard",
  (interactions, prop$, component, lifecycles, renderScheduler) => {
    var requestOpenInteraction = interactions.interaction<any>();
    var questionContainerSizeInteraction = interactions.interaction<ClientRect>();
    var answerContainerSizeInteraction = interactions.interaction<ClientRect>();
    var centerClozeInteraction = interactions.interaction<number>();
    var centerAnswerInteraction = interactions.interaction<number>();
    var adjustParagraphInteraction = interactions.interaction<number>();
    var openSubject = interactions.interaction<boolean>().subject;
    var disposable = new Rx.CompositeDisposable();
    var answerInteraction = interactions.interaction<number>();
    var resizeInteraction = interactions.interaction<any>();
    var clozeId$ = prop$.map(props => props.clozeIdentifier)
      .distinctUntilChanged((a) => a, (a, b) => a === b);

    var paragraphAdjustment$ = adjustParagraphInteraction.subject.startWith(0);

    var clozeLeft$ = centerClozeInteraction.subject.startWith(0);
    var answerAdjustment$ = centerAnswerInteraction.subject.startWith(0);
    var questionContainerSize$ = questionContainerSizeInteraction.subject.startWith(null);
    var answerContainerSize$ = answerContainerSizeInteraction.subject.startWith(null);
    var open$ = openSubject.startWith(false);

    disposable.add(prop$.map(p => p.isOpen).subscribe(openSubject));
    var requestedOpen$ = requestOpenInteraction.subject
      .withLatestFrom<boolean, boolean>(open$, (_, previousOpen) => !previousOpen);
    disposable.add(requestedOpen$.delay(0).subscribe(openSubject));

    disposable.add(lifecycles.componentDidMount.subscribe(() => {
      window.addEventListener('resize', resizeInteraction.listener);
    }));
    disposable.add(lifecycles.componentWillUnmount.subscribe(() => {
      window.removeEventListener('resize', resizeInteraction.listener);
    }));

    var centeringDisposable = new Rx.SerialDisposable();
    disposable.add(centeringDisposable);
    disposable.add(adjustParagraphInteraction.subject.subscribe(() => {
      centeringDisposable.setDisposable(lifecycles.componentDidUpdate.take(1).subscribe(() => {
        var questionContainer = component.refs['question-container'] as any as HTMLElement;
        if (questionContainer) {
          var questionSpan = component.refs['question-span'] as any as HTMLElement;
          var questionSpanSize = questionSpan.getBoundingClientRect();
          var questionContainerSize = questionContainer.getBoundingClientRect();
          var horCenterAbsolute = (questionContainerSize.width - questionSpanSize.width) / 2;
          var horCenterCur = (questionSpanSize.left - questionContainerSize.left);
          centerClozeInteraction.listener(horCenterAbsolute - horCenterCur);
        }
      }));
    }));
    disposable.add(Rx.Observable.merge<any>(clozeId$, open$, resizeInteraction.subject.delay(200))
      .debounce(0, renderScheduler)
      .subscribe(() => {
        centeringDisposable.setDisposable(Rx.Observable.merge<any>(
          lifecycles.componentDidMount.map(() => "mount"),
          lifecycles.componentDidUpdate.map(() => "update")
        ).take(1).subscribe((v) => {
          var questionContainer = component.refs['question-container'] as any as HTMLElement;
          var answerContainer = component.refs['answer-container'] as any as HTMLElement;

          if (questionContainer) {
            var questionSpan = component.refs['question-span'] as any as HTMLElement;
            var questionSpanSize = questionSpan.getBoundingClientRect();
            var questionContainerSize = questionContainer.getBoundingClientRect();
            if (questionContainerSize.width === 0) return;
            var questionAdjustment = component.refs['question-adjustment'] as any as HTMLElement;
            var questionAdjustmentSize = questionAdjustment.getBoundingClientRect();
            var paragraphAdjustment = isIOS()
              ? questionAdjustmentSize.width
              : questionAdjustmentSize.height;

            questionContainerSizeInteraction.listener(questionContainerSize);
            var questionHeight = questionContainerSize.height;
            var verCenterAbsolute = (questionHeight - questionSpanSize.height) / 2;
            var verCenterCur = (questionSpanSize.top - questionContainerSize.top);
            var newAdjustment = (((paragraphAdjustment + (verCenterAbsolute - verCenterCur)) % questionHeight) + questionHeight) % questionHeight;
            adjustParagraphInteraction.listener(newAdjustment);
          }

          if (answerContainer) {
            var answerContainerSize = answerContainer.getBoundingClientRect();
            answerContainerSizeInteraction.listener(answerContainerSize);
            var answerSpan = component.refs['answer-span'] as any as HTMLElement;
            var answerSpanSize = answerSpan.getBoundingClientRect();
            centerAnswerInteraction.listener(
              (answerContainerSize.width - answerSpanSize.width) / 2);
          }
        }));
      }));

    var localState$ = clozeLeft$.combineLatest<number, number, boolean, ClientRect, ClientRect, LocalState>(
      answerAdjustment$, paragraphAdjustment$, open$, questionContainerSize$, answerContainerSize$,
      (clozeLeft, answerAdjustment, paragraphAdjustment, isOpen, questionContainerSize,
       answerContainerSize) => {

        return {
          clozeLeft,
          answerAdjustment,
          paragraphAdjustment,
          isOpen,
          questionContainerSize,
          answerContainerSize,
        };
      }).debounce(0, renderScheduler);

    var localProp$ = prop$.map<LocalProps>((props:StudyCardProps) => {
      var note = props.note;
      var clozeId = props.clozeIdentifier;
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

      return {
        preMarker,
        postMarker,
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
        props
      };
    });

    var localStateAndProp$ = localProp$.combineLatest<LocalState, [LocalProps, LocalState]>(
      localState$, (props, state) => [props, state]).delay(0, renderScheduler);

    return {
      dispose: disposable,
      view: localStateAndProp$.map(([localProps, state]:[LocalProps, LocalState]) => {

        var questionOffsetSpan = tap({} as CSSProperties)(s => {
          var adjustment = state.paragraphAdjustment;

          // Ewwwwww
          if (isIOS()) {
            s.width = css.Pixels.of(adjustment);
            s.height = css.Pixels.of(1);
          } else {
            s.height = css.Pixels.of(adjustment);
            s.width = css.Pixels.of(1);
          }
          s.display = css.Display.INLINE_BLOCK;
        });

        var answerDetailsStyles = tap({} as CSSProperties)(s => {
          var adjustment = state.answerAdjustment;

          s.marginRight = css.Pixels.of(adjustment);
        });

        var questionContainerStyles = tap({} as CSSProperties)(s => {
          s.width = css.Percentage.of(100);
          s.position = css.Position.RELATIVE;

          s.left = css.Pixels.of(state.clozeLeft);
        });

        var describeDueAt = (dueInSecs:number) =>
          moment.duration((dueInSecs - localProps.nowTimeSecs) * 1000).humanize(true);

        var clozeIdStr = localProps.props.clozeIdentifier.toString();

        return <div style={topContainerStyles}>
          <div style={headerStyles}>
            { state.isOpen
              ? <div>
              <span style={answerTermStyles}>{localProps.answerTerm}</span>
              ---
              <span style={answerClozeStyles}>{localProps.answerCloze}</span>
            </div>
              : <div>
              <div>
                was due {describeDueAt(localProps.wasDueAtSecs)}
              </div>
            </div> }
          </div>
          <div onClick={requestOpenInteraction.listener}
               onTouchTap={(e) => { e.preventDefault(); requestOpenInteraction.listener(e); }}>
            <ScreenFitVerticalParagraph
              key={clozeIdStr}
              heightGiven={flourishHeight + flourishMargin + headerHeight}
              style={{ textAlign: css.TextAlign.LEFT }}>
              { state.isOpen
                ? <div key="answer" style={answerDetailsBlockStyles} ref="answer-container">
                <div style={answerDetailsStyles}>
                  <span ref="answer-span">
                    {localProps.answerDetailsFirstCharacter}
                  </span>
                  {localProps.answerDetails.map((d, i) => <span
                    key={clozeIdStr + "-" + i}>{d}
                    <br/>
                  </span>)}
                </div>
              </div>
                : <div key="question" style={questionContainerStyles} ref="question-container">

                <div style={questionOffsetSpan} ref="question-adjustment">
                </div>
                {localProps.preMarker}
                <span style={termStyles}>
                  {localProps.preCloze}
                  <span style={clozeStyles} ref="question-span">
                    ?
                  </span>
                  {localProps.postCloze}
                </span>
                {localProps.postMarker}
              </div> }
            </ScreenFitVerticalParagraph>
          </div>
          <div style={{ marginTop: css.Pixels.of(5) }}>
            { state.isOpen
              ? <div>
              <button style={baseButtonStyles}
                      onClick={(e:SyntheticEvent) => { e.stopPropagation(); answerInteraction.listener(HARD_FACTOR); }}>
                Hard
                <div className="only-desktop">
                  <div style={dueAtStyles}>
                    next&nbsp;
                    {describeDueAt(localProps.hardDueAtSecs)}
                  </div>
                  <div style={shortcutKeyStyles}>a</div>
                </div>
              </button>
              <button style={baseButtonStyles}
                      onClick={(e:SyntheticEvent) => { e.stopPropagation(); answerInteraction.listener(FINE_FACTOR); }}>
                Fine
                <div className="only-desktop">
                  <div style={dueAtStyles}>
                    next&nbsp;
                    {describeDueAt(localProps.fineDueAtSecs)}
                  </div>
                  <div style={shortcutKeyStyles}>s</div>
                </div>
              </button>
              <button style={baseButtonStyles}
                      onClick={(e:SyntheticEvent) => { e.stopPropagation(); answerInteraction.listener(EASY_FACTOR); }}>
                Easy
                <div className="only-desktop">
                  <div style={dueAtStyles}>
                    next&nbsp;
                    {describeDueAt(localProps.easyDueAtSecs)}
                  </div>
                  <div style={shortcutKeyStyles}>d</div>
                </div>
              </button>
            </div>
              : <div style={flourishContainerStyles}>
              <ScrollworkFlourish style={flourishStyles}></ScrollworkFlourish>
              { localProps.hint
                ? <div style={hintContainerStyles}>
                <div style={hintBlockStyles}>
                  { localProps.hint }
                </div>
              </div>
                : null }
            </div> }
          </div>
        </div >
      }),
      events: {
        onRequestOpen: requestedOpen$,
        onAnswer: answerInteraction.subject
      }
    }
  });
