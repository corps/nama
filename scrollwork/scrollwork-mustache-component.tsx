import * as React from "react";
import { component } from "../cycle-rx-utils/components";
import * as Rx from "rx-lite";
import { CSSProperties } from "../css-properties/css-properties";

interface Props {
  style?: CSSProperties
}

export var ScrollworkMustache = component<Props>("ScrollworkMustache",
  (interactions, prop$) => {
    var path = `M18.4 6.4 l-7.6 2.6 9.1 2.8 c5 1.5 9.7 2.8 10.5 2.7 1.5 0 10.1 -4.7 10.1 -5.5 0 -0.2 -1.7 -1.6 -3.7 -3 -4.7 -3.2 -8.5 -3.1 -18.4 0.4z M61.2 6 c-2 1.4 -3.7 2.8 -3.7 3 0 0.9 8.8 5.5 10.7 5.5 1.1 0 5.2 -1.1 9.1 -2.5 3.9 -1.4 8 -2.5 8.9 -2.5 3 -0.1 -15 -6 -18.2 -6 -1.7 0 -4.7 1.1 -6.8 2.5z M45.7 5.7 c-2.8 2.8 -0.7 7.8 3.3 7.8 2.7 0 4.5 -1.8 4.5 -4.5 0 -2.7 -1.8 -4.5 -4.5 -4.5 -1.2 0 -2.6 0.5 -3.3 1.2z M2 8.4 c-0.7 1.2 1.2 2.4 2.5 1.6 1.1 -0.7 0.4 -2.5 -1 -2.5 -0.5 0 -1.1 0.4 -1.5 0.9z M93 8.4 c-0.7 1.2 1.2 2.4 2.5 1.6 1.1 -0.7 0.4 -2.5 -1 -2.5 -0.5 0 -1.1 0.4 -1.5 0.9z`;

    return prop$.map(
      ({ style }) => {
        return <svg viewBox="0 0 97.5 17.5"
                    preserveAspectRatio="xMidYMid meet"
                    style={style}>
          <path d={ path }/>
        </svg>
      }
    );
  });
