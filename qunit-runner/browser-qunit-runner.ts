import * as QUnit from "qunitjs";
import { setupRunner } from "./qunit-runner";

require("./qunit.css");

var callPhantom:(data:any)=>any = (window as any)["callPhantom"];

QUnit.config.autostart = false;
QUnit.config.pageLoaded = false;

function writeToNode(message:string) {
  if (!callPhantom) {
  } else {
    callPhantom({method: 'writeToNode', message: message});
  }
}

function errorToNode(message:string) {
  if (!callPhantom) {
  } else {
    callPhantom({method: 'errorToNode', message: message});
  }
}

if (callPhantom) {
  console.log = (...parts:any[]) => {
    writeToNode(parts.map(p => typeof p === "string" ? p : JSON.stringify(p)).join(" ") + "\n");
  };

  console.error = (...parts:any[]) => {
    errorToNode(parts.map(p => typeof p === "object" ? JSON.stringify(p) : p + "").join(" "));
  };
}

setupRunner(writeToNode, (success) => {
  if (!callPhantom) {
    console.log("Done!");
  } else {
    callPhantom({method: 'testsDone', success: success});
  }
});

setTimeout(() => {
  QUnit.load();
  QUnit.start();
}, 10);
