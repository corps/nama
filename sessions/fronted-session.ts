import { Headers, Cookies } from "../web-server/header-and-cookie-names";
import { assignFromJson } from "../model-helpers/model-helpers";
import { ClientSession } from "./session-model";
import {transform} from "../utils/obj";

var loadedClientSession:ClientSession = new ClientSession();
var loaded = false;

export function loadClientSession() {
  if (!loaded) {
    var matches = document.cookie.match('(^|;) ?' + Cookies.CLIENT_SESSION + '=([^;]*)(;|$)');
    if (matches) {
      var json = JSON.parse(decodeURIComponent(matches[2]));
      assignFromJson(loadedClientSession, json);
      return loadedClientSession;
    }
  }

  return loadedClientSession;
}

export function login(session:ClientSession) {
  document.cookie = Cookies.CLIENT_SESSION + "=" + encodeURIComponent(JSON.stringify(session));
  assignFromJson(loadedClientSession, session);
  loaded = true;
}

export function logout() {
  eraseCookieFromPath(Cookies.SESSION_ID, "/");
  eraseCookieFromPath(Cookies.CLIENT_SESSION, "/");
  loadedClientSession = new ClientSession();
}

// Borrowed from http://stackoverflow.com/questions/179355/clearing-all-cookies-with-javascript
function eraseCookieFromPath(name:string, path:string) {
  document.cookie = name + '=; expires=Thu, 01-Jan-1970 00:00:01 GMT;';
  document.cookie = name + '=; expires=Thu, 01-Jan-1970 00:00:01 GMT; path=' + path + ';';
}
