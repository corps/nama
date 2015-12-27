declare module "react-dom/server" {
  import React = require("react");
  function renderToString(element: React.ReactElement<any>): string;
  function renderToStaticMarkup(element: React.ReactElement<any>): string;
}

declare module "react-dom" {
  import React = require("react");
  export function render(element: React.ReactElement<any>, container:HTMLElement): void;
}

declare namespace  __React {
  interface DOMAttributesBase<T> extends Props<T> {
    onTouchTap?: TouchEventHandler;
  }
}
