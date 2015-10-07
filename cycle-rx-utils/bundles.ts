import * as Cycle from "cycle-react";
import * as Rx from "rx-lite";
import * as React from "react";
import { CONTENT_ID } from "../html-host/html-host";
import { Interactions } from "./interactions";
import * as ReactDOM from "react-dom";
import injectTapEventPlugin = require("react-tap-event-plugin");
injectTapEventPlugin();


export function main(runner:()=>React.ReactElement<any>) {
  if (typeof window == "object") {
    var start = () => {
      var contentEl = document.getElementById(CONTENT_ID);
      contentEl.style.display = "block";
      ReactDOM.render(runner(), contentEl);
    };
    if (document.readyState != "loading") {
      start()
    } else {
      document.addEventListener("DOMContentLoaded", start, false);
    }
  }
}