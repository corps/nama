import { CSSProperties, Percentage, Pixels, Position } from "../css-properties/css-properties";
import { tap } from "../utils/obj";
import * as Colors from "./colors";
import {TextAlign} from "../css-properties/css-properties";
import {Display} from "../css-properties/css-properties";

var msWritingMode:{[k:string]:string} = {
  "vertical-rl": "tb-rl"
};

export function writingMode(mode:string):CSSProperties {
  return {
    writingMode: mode,
    WebkitWritingMode: mode,
    MozWritingMode: mode,
    MsWritingMode: msWritingMode[mode] || mode,
  }
}

export var shortcutKeyStyles = tap({} as CSSProperties)(s => {
  s.backgroundColor = Colors.DEAR_OLD_TEDDY;
  s.color = Colors.OLD_PAPER;
  s.paddingTop = s.paddingBottom = Pixels.of(4);
  s.width = Pixels.of(30);
  s.display = Display.INLINE_BLOCK;
  s.textAlign = TextAlign.CENTER;
  s.borderRadius = Pixels.of(5);
  s.fontSize = 14;
  s.fontFamily = "Monospace";
});

export function backgroundLayer(color = Colors.BG) {
  return tap({} as CSSProperties)((s) => {
    s.backgroundColor = color;
    s.minHeight = Percentage.of(100);
    s.width = Percentage.of(100);
    s.position = Position.ABSOLUTE;
  });
}
