import * as React from "react";
import { component } from "../cycle-rx-utils/components";
import * as Rx from "rx-lite";
import * as Colors from "../common-styles/colors";
import { highlightedCharacter } from "../common-styles/shapes";
import { Logout } from "../api/endpoints";
import { backgroundLayer, shortcutKeyStyles } from "../common-styles/layouts";
import { BookClosedIcon } from "../icons/book-icons";
import { ScrollworkRosehandle } from "../scrollwork/scrollwork-rosehandle-component";
import { ScrollworkMustache } from "../scrollwork/scrollwork-mustache-component";
import { simpleInput, simpleInputRosehandle } from "../common-styles/inputs";

import { assign, tap } from "../utils/obj";
import { CSSProperties } from "../css-properties/css-properties";
import * as css from "../css-properties/css-properties";
import {Interactions, filterPositiveIntegers, passThrough} from "../cycle-rx-utils/interactions";
import {FrontendAppState} from "../frontend-app-state-machine/frontend-app-state";
import {LocalSettings} from "../local-storage/local-settings-model";

var containerStyles = tap({} as CSSProperties)((s) => {
  s.marginTop = css.Pixels.of(64);
  s.textAlign = css.TextAlign.CENTER;
  s.paddingLeft = css.Pixels.of(16);
  s.paddingRight = css.Pixels.of(16);
});

var exampleBlockStyles = tap({} as CSSProperties)((s) => {
  s.marginTop = css.Pixels.of(10);
  s.marginBottom = css.Pixels.of(10);
  s.backgroundColor = Colors.WHITE;
  s.padding = css.Pixels.of(6);
  s.fontSize = css.Percentage.of(80);
  s.fontWeight = 300;
});

var howToBlockStyles = tap({} as CSSProperties)((s) => {
  s.maxWidth = css.Pixels.of(500);
  s.marginTop = css.Pixels.of(20);
  s.textAlign = css.TextAlign.LEFT;
  s.marginLeft = css.AUTO;
  s.marginRight = css.AUTO;
  s.fontSize = css.Percentage.of(80);
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

var howToListItemStyles = tap({} as CSSProperties)(s => {
  s.marginBottom = css.Pixels.of(10);
})

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

var filterInputRosehandleStyles = tap(
  simpleInputRosehandle(numeralStyles.fontSize as number))(s => {
  s.marginLeft = css.Pixels.of(-11);
  s.marginRight = css.Pixels.of(5);
  s.marginTop = css.Pixels.of(2);
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

var filterInputRowStyles = tap({} as CSSProperties)(s => {
  s.marginTop = css.Pixels.of(6);
});

function filterRow(value:string, onChange:(evt:React.FormEvent)=>void, key:number) {
  return <div style={filterInputRowStyles} key={key + ""}>
    <ScrollworkRosehandle
      style={filterInputRosehandleStyles}/>
    <input style={simpleInput(css.Pixels.of(100))} value={value} onChange={onChange}>
    </input>
  </div>
}

export interface SummaryPageProps {
  appState: FrontendAppState
  onQueueMaxChange?: (v:number)=>void
  onFilterChange?: (v:[string, number])=>void
  onNewFilter?: (v:string)=>void
  onBeginStudying?: (v:any)=>void
  onRefresh?: (v:any)=>void
}

export var SummaryPage = component<SummaryPageProps>("Summary",
  (interactions, prop$) => {
    var queueMaxInteraction = interactions.inputInteraction<number>(filterPositiveIntegers);
    var modifyFilterInteraction = interactions.rowInputInteraction<string>(passThrough);
    var newFilterInteraction = interactions.simpleInputInteraction();
    var beginStudyingInteraction = interactions.preventDefaultInteraction();
    var refreshInteraction = interactions.preventDefaultInteraction();

    return {
      view: prop$.map(({ appState }) => <div style={backgroundLayer()}>
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
              Last Session:&nbsp;
              <span style={numeralStyles}>{appState.numStudiedLastSession}</span>
              <br/>
              Due Today:&nbsp;
              <span
                style={numeralStyles}>{appState.summaryStatsLoaded ? appState.summaryStats.dueToday : "?"}</span>
              <br/>
              <br/>
              Study Filters:&nbsp;
              <br/>
              { appState.localSettings.studyFilters.map(
                (value, idx) => { return filterRow(value, modifyFilterInteraction.listenerForIdx(idx), idx) }).concat(
                [filterRow("", newFilterInteraction.listener, appState.localSettings.studyFilters.length )]
                ) }
            </div>

            <div style={howToBlockStyles}>
              <p>
                <a name="usage">Usage</a>
              </p>
              <p>
                <ol>
                  <li style={howToListItemStyles}>
                    Check for a new notebook titled "弁SRS Study Book" that was created upon
                    account creation.  If you've deleted this notebook, trying refreshing this page,
                    and the server will create a new one for you.  If you've renamed the notebook,
                    you can use that notebook regardless of what name you have given it.
                  </li>
                  <li style={howToListItemStyles}>
                    Next, create a note containing some text you want to study.  As an example, copy
                     the following into a new note within your study notebook.
                    <br/>
                    <div style={exampleBlockStyles}>
                      まず、生物化学的観点に立つと、多くの好気的生物では生体内の分子状酸素は、そのほとんどがミトコンドリアでの ATP産生において消費され、最終的には酵素的に還元されて水分子に変換され（詳細は記事ミトコンドリアや電子伝達系を参照のこと）、少量の酸素がヒドロキシル化代謝反応のオキシゲナーゼ酵素の基質[1]として利用される。また特筆すべきは活性酸素種ですら、白血球[2]が貪食した細菌に示す殺菌作用物質として白血球内部で発生したり、
                      <br/>
                      <br/>
                      [1] 基質
                      <br/>
                      -- 基
                      <br/>
                      -- 質
                      <br/>
                      基質 酵素によって化学反応を触媒される物質。 酵素反応以外に触媒反応全般に拡張して用いたり、化学反応全般に対して原料物質という意味で使用されることもある。 菌床（真菌が菌糸網を形成している場所）の、菌糸の間に在って栄養源になっているもの。
                      <br/>
                      <br/>
                      [2] 白血球
                      <br/>
                      ? White blood cells
                      <br/>
                      -- 白
                      <br/>
                      -- 血球
                      <br/>
                      白血球（はっけっきゅう、英: White blood cellあるいは英: Leukocyte）は、広義には生体防御に関わる免疫担当細胞を指す。
                    </div>
                  </li>
                  <li style={howToListItemStyles}>
                    After creating thew new, you can hit "r" to refresh your local deck, and "enter"
                    to begin studying the new material.
                  </li>
                </ol>

                <p>
                  Essentially, to create new study clozes, simply annotate words to be closed with
                  a unique marker surrounded in
                  <code>[</code>
                  and<code>]</code>, as we did above with
                基質[1] and 白血球[2].  Then,<em>using a blank new line</em>, separate your content
                from blocks of cloze definitions that follow the below syntax:
                </p>
                <div style={exampleBlockStyles}>
                  [<em>the marker</em>] <em>the word to be clozed</em><br/>
                  ? <em>an (optional) hint</em><br/>
                  -- <em>the part of the word to be clozed</em><br/>
                  <em>Some definition or additional context for the answer</em>
                </div>
                <p>
                  It's important to remember that empty new lines are used to separate note
                  content and <em>each individal clozed term</em>.
                </p>
                <p>
                  Additional tutorial material coming soon.
                </p>
              </p>
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

export interface SettingContainerProps {
  children?: React.ReactNode[]
  lineHeight: number
}
