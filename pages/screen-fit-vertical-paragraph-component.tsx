import * as React from "react";
import { component } from "../cycle-rx-utils/components";
import * as Rx from "rx-lite";
import {CSSProperties} from "../css-properties/css-properties";
import {tap} from "../utils/obj";
import * as css from "../css-properties/css-properties";
import {writingMode} from "../common-styles/layouts";
import {assign} from "../utils/obj";

interface ScreenFitVerticalParagraphProps {
  heightGiven: number
  children?: React.ReactNode[]
  key?: string
  style?: CSSProperties
}

export var ScreenFitVerticalParagraph = component<ScreenFitVerticalParagraphProps>(
  "ScreenFitVerticalParagraph",
  (interactions, prop$) => {
    interactions.interaction<any>().subject.subscribeOnCompleted(() => {
      console.log("interaction gone");
    });

    return prop$.map((props:ScreenFitVerticalParagraphProps) => {
      var style = tap({})((s:CSSProperties) => {
        s.height = css.Calc.diffOf(css.Percentage.of(100), css.Pixels.of(props.heightGiven));
        s.width = css.Percentage.of(100);
        assign(s, writingMode("vertical-rl"));
        if (props.style) assign(s, props.style);
      });

      return <div style={style}>
        {props.children}
      </div>
    })
  });
