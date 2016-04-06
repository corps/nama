import * as React from "react";
import {component} from "../cycle-rx-utils/components";
import * as Rx from "rx-lite";
import * as Colors from "../common-styles/colors";
import {highlightedCharacter} from "../common-styles/shapes";
import {Logout} from "../api/endpoints";
import {backgroundLayer, shortcutKeyStyles} from "../common-styles/layouts";
import {BookClosedIcon} from "../icons/book-icons";
import {ScrollworkRosehandle} from "../scrollwork/scrollwork-rosehandle-component";
import {ScrollworkMustache} from "../scrollwork/scrollwork-mustache-component";
import {simpleInput, simpleInputRosehandle} from "../common-styles/inputs";

import {assign, tap} from "../utils/obj";
import {CSSProperties} from "../css-properties/css-properties";
import * as css from "../css-properties/css-properties";
import {Interactions, filterPositiveIntegers, passThrough} from "../cycle-rx-utils/interactions";
import {FrontendAppState} from "../frontend-app-state-machine/frontend-app-state";
import {LocalSettings} from "../local-storage/local-settings-model";
import {insertCss} from "../style-helpers/insert-css";

var containerStyles = tap({} as CSSProperties)((s) => {
  s.textAlign = css.TextAlign.CENTER;
  s.paddingLeft = css.Pixels.of(16);
  s.paddingRight = css.Pixels.of(16);
  s.paddingBottom = css.Pixels.of(30);
});

var headingStyles = tap({} as CSSProperties)((s) => {
  s.fontSize = 28;
  s.fontWeight = "normal";
});

var imageContainterStyles = tap({} as CSSProperties)(s => {
  s.marginTop = css.Pixels.of(16);
  s.marginBottom = css.Pixels.of(16);
  assign(s, highlightedCharacter(148, false, Colors.DEAR_OLD_TEDDY))
});

var imageStyles = tap({} as CSSProperties)(s => {
  s.width = css.Pixels.of(128);
  s.marginTop = css.Pixels.of(25);
  s.fill = Colors.OLD_PEA;
});

var nameHighlightStyles = tap({} as CSSProperties)((s) => {
  s.fontSize = 23;
});

var numeralStyles = tap({} as CSSProperties)((s) => {
  s.fontSize = 27;
});

var progressContainerStyles = tap({} as CSSProperties)(s => {
  s.lineHeight = 1.1;
  s.position = css.Position.ABSOLUTE;
  s.top = css.Pixels.of(35);
  s.left = css.Pixels.of(72);
  s.width = css.Pixels.of(80);
  s["transform"] = "rotate(-10deg)";
});

var progressNumeratorStyles = tap({} as CSSProperties)((s) => {
  s.fontSize = 15;
});

var progressDenominatorStyles = tap({} as CSSProperties)((s) => {
  s.fontSize = 15;
});

export interface SummaryPageProps {
  appState:FrontendAppState
  onQueueMaxChange?:(v:number)=>void
  onFilterChange?:(v:[string, number])=>void
  onNewFilter?:(v:string)=>void
  onBeginStudying?:(v:any)=>void
  onRefresh?:(v:any)=>void
}

export var SummaryPage = component<SummaryPageProps>("Summary",
  (interactions, prop$) => {
    var queueMaxInteraction = interactions.inputInteraction<number>(filterPositiveIntegers);
    var modifyFilterInteraction = interactions.rowInputInteraction<string>(passThrough);
    var newFilterInteraction = interactions.simpleInputInteraction();
    var beginStudyingInteraction = interactions.preventDefaultInteraction();
    var refreshInteraction = interactions.preventDefaultInteraction();

    return {
      view: prop$.map(({appState}) => <div style={backgroundLayer()}>
          <div>
            <div className="only-desktop" style={{ marginTop: 60 }}>
            </div>
            <div style={containerStyles}>
              <div style={headingStyles}>
                Welcome back,&nbsp;<span
                style={nameHighlightStyles}>{appState.clientSession.userName}</span>!
              </div>
              <div>
                Not your account?
                &nbsp;
                <a href={Logout.path}>Logout</a>
              </div>

              <div>
                <div style={imageContainterStyles}>
                  <BookClosedIcon style={imageStyles}/>
                  <div style={progressContainerStyles}>
                    <div style={progressNumeratorStyles}>
                    <span
                      style={numeralStyles}>{appState.scheduledStudy.scheduledClozes.length}</span>
                      <br/>
                      queued
                    </div>
                    <div style={progressDenominatorStyles}>
                      <ScrollworkRosehandle
                        style={tap(simpleInputRosehandle(numeralStyles.fontSize as number))(
                    s => s.marginLeft = css.Pixels.of(-11))}/>
                    <span style={numeralStyles}>
                      <input value={appState.localSettings.maxQueueSize + ""}
                             onChange={queueMaxInteraction.listener}
                             style={simpleInput(css.Pixels.of(40))}/>
                    </span>
                      <br/>
                      max
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ lineHeight: 1.2 }}>
                <div>
                  <a onClick={beginStudyingInteraction.listener} href="#">Begin study</a>&nbsp;
                  <span className="only-desktop-inline" style={shortcutKeyStyles}>&crarr;</span>
                </div>
                <div style={{ marginTop: css.Pixels.of(4) }}>
                  <a onClick={refreshInteraction.listener} href="#">Refresh</a>&nbsp;
                  <span className="only-desktop-inline" style={shortcutKeyStyles}>r</span>
                </div>
                <div style={{ marginTop: css.Pixels.of(10), marginBottom: css.Pixels.of(5) }}>
                  <ScrollworkMustache style={{ height: css.Pixels.of(20) }}/>
                </div>
                Session:&nbsp;
                <span style={numeralStyles}>{appState.numStudiedCurSession}</span>&nbsp;
              studied
                <br/>
                Due Today:&nbsp;
              <span
                style={numeralStyles}>{appState.summaryStatsLoaded ? appState.summaryStats.dueToday : "?"}</span>
              </div>
            </div>
          </div>
        </div>
      ),
      events: {
        onQueueMaxChange: queueMaxInteraction.subject,
        onFilterChange: modifyFilterInteraction.subject,
        onNewFilter: newFilterInteraction.subject,
        onBeginStudying: beginStudyingInteraction.subject,
        onRefresh: refreshInteraction.subject
      }
    }
  });

