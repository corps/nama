import { loadClientSession } from "../sessions/fronted-session";
import { CONTENT_ID } from "../html-host/content-id";
require("./inline-css-bundle");

document.onreadystatechange = function () {
  if (document.readyState == "interactive") {
    var session = loadClientSession();
    if (session.isLoggedIn()) {
      document.getElementById(CONTENT_ID).style.display = "none";
    }
  }
}
