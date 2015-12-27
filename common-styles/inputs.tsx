import * as css from "../css-properties/css-properties";
import * as Colors from "../common-styles/colors";
import { assign, tap } from "../utils/obj";
import { CSSProperties } from "../css-properties/css-properties";

export var baseInputStyles = tap({} as CSSProperties)(s => {
  s.background = css.Background.TRANSPARENT;
  s.borderBottomWidth = css.Pixels.of(3);
  s.borderTopWidth = css.Pixels.of(0);
  s.borderLeftWidth = css.Pixels.of(0);
  s.borderRightWidth = css.Pixels.of(0);
  s.borderColor = Colors.DEAR_OLD_TEDDY;
  s.borderStyle = "dashed";
  s.paddingLeft = css.Pixels.of(4);
  s.paddingRight = css.Pixels.of(4);
});

export var baseButtonStyles = tap({} as CSSProperties)((s:CSSProperties) => {
  s.marginLeft = css.Pixels.of(4);
  s.marginRight = css.Pixels.of(4);

  s.marginTop = css.Pixels.of(4);
  s.marginBottom = css.Pixels.of(4);

  s.paddingTop = css.Pixels.of(6);
  s.paddingBottom = css.Pixels.of(6);
  s.paddingLeft = css.Pixels.of(30);
  s.paddingRight = css.Pixels.of(30);

  s.borderStyle = "none";
  s.backgroundColor = Colors.OLD_PAPER.multiply(0.9);
});

export function simpleInput(width:css.Metric) {
  return tap({} as CSSProperties)(s => {
    assign(s, baseInputStyles);
    s.width = width;
  });
}

var baseRosehandleStyles = tap({} as CSSProperties)((s) => {
  s.verticalAlign = css.VerticalAlign.MIDDLE;
});

export function simpleInputRosehandle(fontSize:number) {
  return tap({} as CSSProperties)(s => {
    assign(s, baseRosehandleStyles);
    s.height = css.Pixels.of(fontSize * 0.75);
  });
}
