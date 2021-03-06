import * as React from "react";
import { component } from "../cycle-rx-utils/components";
import * as Rx from "rx-lite";
import {CSSProperties} from "../css-properties/css-properties";

interface Props {
  style?: CSSProperties
}

export var BookClosedIcon = component<Props>("BookClosedIcon",
  (interactions, prop$) => {
    return prop$.map(
      ({ style }) => {
        return <svg
          viewBox="0 0 218 285"
          preserveAspectRatio="xMidYMid meet"
          style={style}>
          <g>
            <path
              d="M163.7 3 c-11.1 5.8 -31.4 11.7 -49.7 14.4 -23.4 3.6 -72.9 6.8 -84 5.6 l-5.7 -0.7 -4.6 6.8 c-2.5 3.7 -8 11.7 -12.2 17.8 -4.1 6 -7.3 11.5 -7 12.3 0.2 0.7 2.3 10.3 4.5 21.5 2.2 11.1 4.4 22.4 5 25.2 3.8 18.8 7.5 37.4 17.6 88 1.8 9.3 4.3 21.2 5.4 26.4 1.1 5.2 2 9.7 2 10 0 0.3 0.5 0 1.1 -0.6 0.7 -0.7 2.2 -0.8 4.2 -0.2 1.8 0.4 17.2 1.3 34.2 1.9 17.1 0.6 32.4 1.3 34.1 1.6 2.8 0.5 3.2 1.1 4.2 5.6 2.5 10.4 0.6 17.2 -7.9 29.1 l-5.9 8.2 2.9 0.3 c6.4 0.7 17.5 -8.3 20.7 -16.6 0.9 -2.3 2.1 -4.2 2.6 -4.2 0.4 0 1.5 1.5 2.4 3.3 1.5 3.1 1.5 3.9 -0.5 11 -2.6 9.4 -2.6 8.7 0.2 8.7 9.5 0 15.3 -19.5 11.2 -37.6 -0.9 -3.6 -1.5 -6.7 -1.3 -6.9 0.2 -0.1 5.5 0.1 11.8 0.6 6.3 0.4 16.8 0.8 23.3 0.8 11.6 0.1 11.8 0.1 12.9 -2.4 0.6 -1.4 1.4 -2.5 1.7 -2.5 0.8 0 4.4 -6 3.9 -6.4 -0.1 -0.2 -10.4 -0.8 -22.8 -1.5 -30.5 -1.6 -38 -2.2 -38 -3.2 0 -0.5 1.7 -0.9 3.7 -0.9 4.8 0 23.7 -2.9 33.3 -5.2 11.2 -2.6 31.2 -9.7 33.4 -11.9 0.5 -0.5 -2.2 0.1 -6 1.2 -7.8 2.4 -10.1 2.9 -23.4 5.7 -13.4 2.8 -22.3 4.2 -25.6 4.1 -1.9 -0.1 -1.2 -0.4 2.1 -1 23.6 -4.2 41.7 -9.2 50.5 -14.1 3.9 -2.1 3.3 -2.1 -10 1.4 -5.2 1.4 -12.4 3.1 -16 3.7 -3.6 0.7 -8.7 1.6 -11.5 2.1 -18.1 3.4 -49.7 5.9 -75 6.1 -17.5 0.1 -16.1 1.2 3.2 2.4 8.2 0.5 11.3 1.1 11.7 2.1 0.4 1.2 -2.2 1.4 -15.7 1.5 -10 0.1 -14.7 0.5 -12.2 0.9 5.3 0.9 -13.2 1.3 -19.9 0.4 l-4.8 -0.7 8.2 -8.2 8.1 -8.2 23.6 0.5 c26.3 0.5 43.9 -0.7 67.8 -4.9 15.4 -2.7 43.9 -10.6 50.9 -14.1 1.9 -1 1.9 -1.5 -0.4 -11.8 -0.6 -2.5 -1.4 -6.5 -1.9 -9 -2.3 -12.2 -7.3 -35.6 -7.7 -36.2 -0.3 -0.4 -0.9 -3.1 -1.4 -6 -0.6 -2.9 -1.4 -7.1 -1.9 -9.3 -0.5 -2.2 -1.8 -8.5 -2.9 -14 -2.1 -10 -5.8 -27.4 -10.7 -50 -1.4 -6.6 -3 -14 -3.5 -16.5 -0.5 -2.5 -2 -9.9 -3.4 -16.5 -1.5 -6.5 -2.6 -12 -2.6 -12.2 0 -0.7 -1.8 -0.1 -6.3 2.3z m-131.3 28.6 c0.2 0.7 1.4 6.7 2.6 13.3 1.2 6.6 3.1 16 4.1 21 1.1 4.9 2.4 11.2 2.9 14 0.6 2.7 1.9 9.5 3.1 15 1.9 9.2 5.2 25.7 8 39.5 0.6 3 1.5 7.3 2 9.5 0.5 2.2 1.8 8.9 2.9 15 1.2 6 2.7 13.5 3.5 16.5 2.7 11.2 2.8 13 0.6 13 -2.2 0 -2.9 -2 -5.5 -15.5 -1.4 -7.2 -2.4 -12.2 -5.6 -28 -1.9 -9.4 -4.1 -20 -6.6 -32 -1.4 -6.6 -2.9 -14 -3.4 -16.5 -0.4 -2.5 -2.3 -12.4 -4.3 -22 -1.9 -9.6 -3.7 -18.6 -4 -20 -0.3 -1.4 -1.4 -6.7 -2.6 -11.9 -1.2 -5.2 -2.1 -10.1 -2.1 -10.8 0 -1.7 3.9 -1.7 4.4 -0.1z"/>
          </g>
        </svg>
      }
    );
  });
