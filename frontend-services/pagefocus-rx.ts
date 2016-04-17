// Adapted from http://stackoverflow.com/questions/1060008/is-there-a-way-to-detect-if-a-browser-window-is-not-currently-active
import * as Rx from "rx-lite";

const focusSubject = new Rx.Subject<void>();
const blurSubject = new Rx.Subject<void>();

export const focus$ = focusSubject.asObservable();
export const blur$ = blurSubject.asObservable();

if ('window' in global) {
  (function (w:typeof window) {
    var isHiddenAttr = "hidden";

    if (isHiddenAttr in w.document) {
      w.document.addEventListener("visibilitychange", onchange);
    } else if ((isHiddenAttr = "mozHidden") in w.document) {
      w.document.addEventListener("mozvisibilitychange", onchange);
    } else if ((isHiddenAttr = "webkitHidden") in w.document) {
      w.document.addEventListener("webkitvisibilitychange", onchange);
    } else if ((isHiddenAttr = "msHidden") in w.document) {
      w.document.addEventListener("msvisibilitychange", onchange);
    } else {
      w.onpageshow = w.onpagehide
        = w.onfocus = w.onblur = onchange;
    }

    function onchange(evt:{type:string}) {
      var evtMap = {
        focus: "visible",
        focusin: "visible",
        pageshow: "visible",
        blur: "hidden",
        focusout: "hidden",
        pagehide: "hidden"
      } as {[k:string]:string};

      evt = evt || w.event;
      var hidden = false;
      if (evt.type in evtMap) {
        hidden = evtMap[evt.type] === "hidden";
      } else {
        hidden = this[isHiddenAttr];
      }

      if (hidden) {
        blurSubject.onNext(null);
      } else {
        focusSubject.onNext(null);
      }
    }

    // set the initial state (but only if browser supports the Page Visibility API)
    if ((<any>w.document)[isHiddenAttr] !== undefined) {
      onchange({type: (<any>w.document)[isHiddenAttr] ? "blur" : "focus"});
    }
  })(window);
}