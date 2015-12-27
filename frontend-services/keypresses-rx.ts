import * as Rx from "rx-lite";

const keySubject = new Rx.Subject<string>();

export const key$ = keySubject.asObservable();

if ('window' in global) {
  (function (w:typeof window) {
    w.document.addEventListener('keypress', (event:KeyboardEvent) => {
      keySubject.onNext(String.fromCharCode(event.keyCode || event.which));
    });
  })(window);
}
