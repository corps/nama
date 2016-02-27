import {insertCss} from "../style-helpers/insert-css";
import {isIOS} from "../utils/browser";

// TODO: Remove the 2 when renaming other only-mobile
export var isMobileStyleName = 'is-mobile-2';
export var isDesktopStyleName = 'is-desktop-2';
export var onlyMobileStyleName = 'only-mobile-2';
export var onlyDesktopStyleName = 'only-desktop-2';

insertCss(`
.${onlyMobileStyleName} {
  display: none;
}

.${isMobileStyleName} .${onlyMobileStyleName} {
  display: block !important;
}

.${onlyDesktopStyleName} {
  display: none;
}

.${isDesktopStyleName} .${onlyDesktopStyleName} {
  display: block !important;
`);

if (typeof document !== "undefined") {
  if (isIOS()) {
    document.body.className += " " + isMobileStyleName;
  } else {
    document.body.className += " " + isDesktopStyleName;
  }
}
