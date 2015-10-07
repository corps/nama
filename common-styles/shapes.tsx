import { CSSProperties } from "../css-properties/css-properties";
import * as css from "../css-properties/css-properties";
import { tap, assign } from "../utils/obj";
import * as Colors from "./colors";

export function circle(innerSize:number, isVertical = false) {
  return tap({} as CSSProperties)((s) => {
    var size = css.Pixels.of(Math.sqrt(2) * innerSize);
    var offset = css.Pixels.of((size.value - innerSize) / -2);
    s.borderRadius = css.Percentage.of(50);
    s.width = size;
    s.height = size;
    s.lineHeight = size.toString();
    s.position = css.Position.RELATIVE;
    if (isVertical) s.left = offset;
  });
}

export function highlightedCharacter(fontSize:number, isVertical = false,
                                     highlight = Colors.OLD_GAMBOGE) {
  return tap({} as CSSProperties)((s) => {
    s.display = css.Display.INLINE_BLOCK;
    s.backgroundColor = highlight;
    s.textShadow = css.NONE;
    s.textAlign = css.TextAlign.CENTER;
    assign(s, circle(fontSize, isVertical));
  });
}
