import {insertCss} from "./insert-css";
import * as React from "react";
import {createMarkupForStyles} from "react/lib/CSSPropertyOperations";

function stateCss(name:string, state:string, style:React.CSSProperties) {
  if (state) state = ':' + state;

  var css = createMarkupForStyles(style);

  // Default borderColor to color
  if (!style["borderColor"] && style["color"]) {
    css += " borderColor: " + style["color"]
  }

  return `.${name}${state} { ${css} }`;
}

export function makeStatesCssClass(name:string,
                                   base:React.CSSProperties,
                                   states:{
                                     visited?: React.CSSProperties,
                                     hover?: React.CSSProperties,
                                     active?:React.CSSProperties,
                                     focus?:React.CSSProperties,
                                     disabled?:React.CSSProperties,
                                   } = {}) {
  var styles = [] as string[];
  styles.push(stateCss(name, '', base));

  if (!states.visited) states.visited = base;

  for (var state in states) {
    styles.push(stateCss(name, state, (states as any)[state]));
  }

  insertCss(styles.join("\n"));
  return name;
}