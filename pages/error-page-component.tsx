import * as React from "react";
import * as Cycle from "cycle-react";
import * as Rx from "rx-lite";
import * as Colors from "../common-styles/colors";
import { Home } from "../api/endpoints";
import { backgroundLayer } from "../common-styles/layouts";
import { highlightedCharacter } from "../common-styles/shapes";
import { tap } from "../utils/obj";
import { ScrollworkMustache } from "../scrollwork/scrollwork-mustache-component";

import { CSSProperties } from "../css-properties/css-properties";
import * as css from "../css-properties/css-properties";

var containerStyles = tap({} as CSSProperties)((s) => {
  s.marginTop = css.Pixels.of(128);
  s.textAlign = css.TextAlign.CENTER;
  s.paddingLeft = css.Pixels.of(16);
  s.paddingRight = css.Pixels.of(16);
});

var headingStyles = tap({} as CSSProperties)((s) => {
  s.fontSize = 64;
});

var smallHeadingStyles = tap({} as CSSProperties)((s) => {
  s.fontSize = 32;
});

var highlightStyles = highlightedCharacter(headingStyles.fontSize as number, false,
  Colors.DEAR_OLD_TEDDY);
highlightStyles.color = Colors.PASTEL_GRAY;

export interface ErrorProperties {
  failureKanji: string
  explanation: string
}

var mustacheStyles = tap({} as CSSProperties)(s => {
  s.width = css.Pixels.of(98);
});

export class ErrorPage extends React.Component<any, any> {
  render() {
    return <div style={backgroundLayer()}>
      <div style={containerStyles}>
        <h1 style={smallHeadingStyles}>
          Whoops!
        </h1>
        <h2 style={headingStyles}>
          <span style={highlightStyles}>{this.props.failureKanji[0]}</span>
          {this.props.failureKanji.slice(1)}
        </h2>

        <br/>
        <ScrollworkMustache style={mustacheStyles}></ScrollworkMustache>
        <p>
          {this.props.explanation}
        </p>
        <p>
          That's okay, you can still return to the <a href={Home.path}>home page</a> and try again.
        </p>
      </div>
    </div>
  }
}
