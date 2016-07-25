import { CSSProperties as ReactCSSProperties } from "react/addons";

export class RGBColor {
  constructor(public red:number, public green:number, public blue:number) {
  }

  toString() {
    return "#" + [this.red, this.green, this.blue].map(v => ("00" + v.toString(16)).slice(-2))
        .join("");
  }

  multiply(n:number) {
    return new RGBColor(
      Math.floor(this.red * n),
      Math.floor(this.green * n),
      Math.floor(this.blue * n));
  }
}

export type Color = RGBColor;

export class VerticalAlign {
  private _isVerticalAlign:any;

  constructor(private value:string) {
  }

  toString() {
    return this.value;
  }

  static MIDDLE = new VerticalAlign("middle");
  static BOTTOM = new VerticalAlign("bottom");
}

export class Background {
  private _isBackground:any;

  constructor(private value:string) {
  }

  toString() {
    return this.value;
  }

  static TRANSPARENT = new Background("transparent");
}

export class Display {
  private _isDisplay:any;

  constructor(private value:string) {
  }

  toString() {
    return this.value;
  }

  static NONE = new Display("none");
  static BLOCK = new Display("block");
  static INLINE = new Display("inline");
  static INLINE_BLOCK = new Display("inline-block");
}

export class Position {
  private _isPosition:any;

  constructor(private value:string) {
  }

  toString() {
    return this.value;
  }

  static ABSOLUTE = new Position("absolute");
  static RELATIVE = new Position("relative");
  static FIXED = new Position("fixed");
}

export class TextAlign {
  private _isTextAlign:any;

  constructor(private value:string) {
  }

  toString() {
    return this.value;
  }

  static CENTER = new TextAlign("center");
  static LEFT = new TextAlign("left");
  static RIGHT = new TextAlign("right");
  static JUSTIFY = new TextAlign("justify");
}

export const INHERIT = {
  _isInherit: true,
  toString: () => "inherit"
};

export const INITIAL = {
  _isInitial: true,
  toString: () => "initial"
};

export const DONE = {
  _isDone: true,
  toString: () => "done"
};

export const NONE = {
  _isNone: true,
  toString: () => "none"
};

export const AUTO = {
  _isAuto: true,
  toString: () => "auto"
};

export class Unit {
  constructor(private v:number) {
  }

  toString() {
    return this.v + (this.constructor as any).unit as string;
  }
}

var ofCache = {} as {[k:string]:any};
function ofGenerator<T extends Unit>(constr:{new(v:number):T, unit:string}) {
  return (v:number) => {
    var key = v + constr.unit;
    var hit = ofCache[key];
    if (!hit) return ofCache[key] = new constr(v);
    return hit;
  }
}

export class Percentage extends Unit {
  percentage = true;
  static unit = "%";
  static of = ofGenerator<Percentage>(Percentage);
}

export class ViewportHeight extends Unit {
  viewportHeight = true;
  static unit = "vh";
  static of = ofGenerator<ViewportHeight>(ViewportHeight);
}

export class Pixels extends Unit {
  pixels = true;
  static unit = "px";
  static of = ofGenerator<Pixels>(Pixels);
}

export class TextShadow {
  private _isTextShadow:any;

  constructor(public xOffset:Metric, public yOffset:Metric, public color:Color) {
  }

  toString() {
    return `${this.xOffset} ${this.yOffset} ${this.color}`;
  }
}

export class Float {
  private _isFloat:any;

  constructor(public value:string) {
  }

  toString() {
    return this.value;
  }

  static LEFT = new Float("left");
  static RIGHT = new Float("right");
}

export class Calc {
  constructor(public operator:string, public left:Metric, public right:Metric) {
  }

  toString():string {
    return "calc(" + this.left.toString() + " " + this.operator + " " + this.right.toString() + ")";
  }

  static sumOf(left:Metric, right:Metric) {
    return new Calc("+", left, right);
  }

  static diffOf(left:Metric, right:Metric) {
    return new Calc("-", left, right);
  }
}

export class BoxShadow {
  constructor(public color:Color, public vAdjustment:Metric, public hAdjustment:Metric,
              public blur?:Metric, public spread?:Metric) {
  }

  toString() {
    var result = this.vAdjustment + " " + this.hAdjustment + " ";
    if (this.blur) result += this.blur + " ";
    if (this.spread) result += this.spread + " ";
    return result + this.color;
  }
}

export type Metric = Pixels | Percentage | Calc | ViewportHeight;
export type Margin = Metric | typeof AUTO | typeof INHERIT;

export interface CSSProperties extends ReactCSSProperties {
  color?: Color
  fill?: Color
  fontFamily?: string,
  backgroundColor?: Color
  boxShadow?: BoxShadow,
  position?: Position
  width?: Metric
  height?: Metric
  minHeight?: Metric
  maxHeight?: Metric
  minWidth?: Metric
  maxWidth?: Metric
  textAlign?: TextAlign
  marginLeft?: Margin,
  marginRight?: Margin,
  marginTop?: Margin,
  marginBottom?: Margin,
  padding?: Metric,
  paddingTop?: Metric,
  paddingRight?: Metric,
  paddingLeft?: Metric,
  paddingBottom?: Metric,
  borderBottomWidth?: Metric,
  borderWidth?: Metric,
  WebkitOverflowScrolling?: string,
  borderLeftWidth?: Metric,
  borderRightWidth?: Metric,
  textIndent?: Metric,
  borderTopWidth?: Metric,
  borderColor?: Color,
  borderStyle?: string,
  display?: Display,
  textShadow?: TextShadow | typeof NONE,
  float?: Float,
  verticalAlign?: VerticalAlign,
  borderRadius?: Metric,
  letterSpacing?: Metric,
  background?: Background | typeof INITIAL | typeof INHERIT,
  left?: Metric,
  right?: Metric,
  top?: Metric,
  bottom?: Metric,
  border?: string,
  overflowY?: string,
  overflowX?: string,
}
