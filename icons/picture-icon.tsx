import * as React from "react";
import { component } from "../cycle-rx-utils/components";
import * as Rx from "rx-lite";
import {CSSProperties} from "../css-properties/css-properties";

interface Props {
  style?: CSSProperties
}

export var PictureIcon = component<Props>("PictureIcon",
  (interactions, prop$) => {
    return prop$.map(
      ({ style }) => {
        return <svg
          viewBox="0 0 315 315"
          preserveAspectRatio="xMidYMid meet"
          style={style}>
          <g>
            <path
              d="M310.58,33.331H5c-2.761,0-5,2.238-5,5v238.918c0,2.762,2.239,5,5,5h305.58c2.763,0,5-2.238,5-5V38.331 C315.58,35.569,313.343,33.331,310.58,33.331z M285.58,242.386l-68.766-71.214c-0.76-0.785-2.003-0.836-2.823-0.114l-47.695,41.979 l-60.962-75.061c-0.396-0.49-0.975-0.77-1.63-0.756c-0.631,0.013-1.22,0.316-1.597,0.822L30,234.797V63.331h255.58V242.386z"/>
            <path
              d="M210.059,135.555c13.538,0,24.529-10.982,24.529-24.531c0-13.545-10.991-24.533-24.529-24.533 c-13.549,0-24.528,10.988-24.528,24.533C185.531,124.572,196.511,135.555,210.059,135.555z"/>
          </g>
        </svg>
      }
    );
  });
