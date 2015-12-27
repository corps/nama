import * as React from "react";
import { component } from "../cycle-rx-utils/components";
import * as Rx from "rx-lite";
import { CSSProperties } from "../css-properties/css-properties";

interface Props {
  style?: CSSProperties
}

export var ScrollworkRosehandle = component<Props>("ScrollworkRosehandle",
  (interactions, prop$) => {
    var path = `M13.5 5 c-1.5 1.8 -0.1 3.9 4.3 6.2 l3 1.5 -4.2 2.5 c-2.2 1.3 -4.1 3 -4.1 3.8 0 1.6 3 3.5 5.4 3.5 1.9 0 3.2 -4 1.6 -5 -0.9 -0.6 -0.1 -1.4 2.5 -2.8 l3.9 -1.9 -3.7 -1.8 c-3.8 -1.8 -4.6 -3 -2.5 -3.7 0.6 -0.2 0.9 -1.2 0.5 -2.1 -0.8 -2.1 -5 -2.2 -6.7 -0.2z M2.4 11.4 l-2.3 1.8 2.7 1.8 c2.5 1.6 2.9 1.6 7.8 -0.1 l5.1 -1.9 -3.9 -1.7 c-5 -2.2 -6.6 -2.2 -9.4 0.1z`;

    return prop$.map(
      ({ style }) => {
        return <svg viewBox="0 0 26 26"
                    preserveAspectRatio="xMidYMid meet"
                    style={style}>
          <path d={ path }/>
        </svg>
      }
    );
  });
