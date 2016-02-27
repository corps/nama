export function insertCss(css:string) {
  if (typeof document === 'undefined') return;

  var element = document.createElement("style");
  element.setAttribute('type', 'text/css');

  if ('textContent' in element) {
    element.textContent = css;
  } else {
    (element as any).styleSheet.cssText = css;
  }

  var head = document.getElementsByTagName('head')[0];
  head.appendChild(element);
}