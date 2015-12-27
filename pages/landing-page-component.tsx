import * as React from "react";
import { component } from "../cycle-rx-utils/components";
import * as Rx from "rx-lite";
import * as Colors from "../common-styles/colors";
import { circle, highlightedCharacter } from "../common-styles/shapes";
import { writingMode } from "../common-styles/layouts";
import { Login } from "../api/endpoints";
import { backgroundLayer } from "../common-styles/layouts";

import { ScrollworkDivider } from "../scrollwork/scrollwork-divider-component";
import { EvernoteIcon } from "../icons/evernote-icon";

import { assign, tap } from "../utils/obj";
import { CSSProperties } from "../css-properties/css-properties";
import * as css from "../css-properties/css-properties";

var verticalLayoutStyles = tap({} as CSSProperties)((s) => {
  s.display = css.Display.INLINE_BLOCK;
  s.height = css.Percentage.of(100);
  s.minHeight = css.Pixels.of(400);
  assign(s, writingMode("vertical-rl"));
});

var creditsStyles = tap({} as CSSProperties)((s:CSSProperties) => {
  s.fontSize = 18;
});

var horizontalLayoutStyles = tap({} as CSSProperties)((s) => {
  s.paddingTop = css.Pixels.of(64);
});

var majorHeadingStyles = tap({} as CSSProperties)((s) => {
  s.fontSize = 108;
  s.verticalAlign = css.VerticalAlign.MIDDLE;
  s.display = css.Display.INLINE_BLOCK;
});

var minorHeadingStyles = tap({} as CSSProperties)((s) => {
  s.fontSize = 24;
  s.lineHeight = 1.6;
});

var minorHeadingBlockStyles = tap({} as CSSProperties)((s) => {
  s.textAlign = css.TextAlign.LEFT;
  s.verticalAlign = css.VerticalAlign.MIDDLE;
  s.display = css.Display.INLINE_BLOCK;
});

var verticalMinorHeadingBlockStyles = tap({} as CSSProperties)((s) => {
  assign(s, minorHeadingBlockStyles);
  s.marginLeft = css.Pixels.of(16);
});

var highlightStyles = highlightedCharacter(minorHeadingStyles.fontSize as number, false);

var verticalHighlightStyles = assign({
  "transform": "rotate(-90deg)"
}, highlightedCharacter(minorHeadingStyles.fontSize as number, true));

var verticalDescriptionBlockStyles = tap({} as CSSProperties)((s) => {
  s.textAlign = css.TextAlign.RIGHT;
  s.marginBottom = css.AUTO;
  s.marginTop = css.AUTO;
  s.height = css.Pixels.of(320);
  assign(s, writingMode("initial"));
});

var horizontalDescriptionBlockStyles = tap({} as CSSProperties)((s) => {
});

var dividerBlockStyles = tap({} as CSSProperties)((s) => {
  s.marginLeft = css.Pixels.of(16);
  s.marginRight = css.Pixels.of(16);
  s.marginBottom = css.Pixels.of(16);
  s.marginTop = css.Pixels.of(16);
});

var LandingMinorHeading = component<{ text: string, verticalOrientation?: boolean }>(
  "LandingMinorHeading",
  (interactions, props) => {
    return props.map(({ text, verticalOrientation }) => <div style={minorHeadingStyles}>
      <span style={ verticalOrientation ? verticalHighlightStyles : highlightStyles }>
        {text[0]}
      </span>
      {text.slice(1)}
    </div>)
  });

export var DescriptionBlock = <div>
  <a href="https://en.wikipedia.org/wiki/Cloze_test">
    Cloze Test
  </a>
  &nbsp;based flash cards
  <br/>
  created from notes in&nbsp;
  <a href="https://evernote.com/">
    Evernote
  </a>
  <br/>
  available online or offline
  <br/>
  in your browser.
  <br/>
  <br/>
  Get started and
  <br/>
  <a href={ Login.path }>
    connect your Evernote&nbsp;
    <EvernoteIcon
      style={{ height: css.Pixels.of(22), marginBottom: css.Pixels.of(3), verticalAlign: css.VerticalAlign.MIDDLE }}/>
  </a>

  <div>
    <br/>
    <br/>
    <br/>
    <div style={creditsStyles}>
      Icons made by&nbsp;
      <a href="http://www.freepik.com" title="Freepik">Freepik</a>
      <br/>
      from&nbsp;
      <a href="http://www.flaticon.com" title="Flaticon">www.flaticon.com</a><br/>
      licensed under
      <a href="http://creativecommons.org/licenses/by/3.0/" title="Creative Commons BY 3.0">
        &nbsp;CC BY 3.0
      </a>
    </div>
  </div>
</div>;

export var LandingPage = component<{}>("Landing",
  (interactions, prop$) => {
    return prop$.map(() => <div style={backgroundLayer()}>
      <div style={{ textAlign: css.TextAlign.CENTER }}>
        <div className="only-mobile">
          <div style={horizontalLayoutStyles}>
            <span style={{marginRight: css.Pixels.of(16)}}>
              <h1 style={majorHeadingStyles}>弁</h1>
            </span>
            <div style={minorHeadingBlockStyles}>
              <LandingMinorHeading text="Spaced"/>
              <LandingMinorHeading text="Repitition"/>
              <LandingMinorHeading text="System"/>
            </div>

            <div style={dividerBlockStyles}>
              <ScrollworkDivider
                style={{ width: css.Pixels.of(280), height: css.Percentage.of(100) }}/>
            </div>

            <div style={horizontalDescriptionBlockStyles}>
              {DescriptionBlock}
            </div>
          </div>
        </div>

        <div className="only-desktop">
          <div style={verticalLayoutStyles}>
            <h1 style={majorHeadingStyles}>弁</h1>
            <div style={verticalMinorHeadingBlockStyles}>
              <LandingMinorHeading text="Spaced" verticalOrientation={true}/>
              <LandingMinorHeading text="Repitition" verticalOrientation={true}/>
              <LandingMinorHeading text="System" verticalOrientation={true}/>
            </div>
            <div style={dividerBlockStyles}>
              <ScrollworkDivider style={{width: css.Pixels.of(40), height: css.Percentage.of(100)}}
                                 verticalOrientation={true}/>
            </div>
            <div style={ verticalDescriptionBlockStyles }>
              {DescriptionBlock}
            </div>
          </div>
        </div>
      </div>
    </div>)
  });
