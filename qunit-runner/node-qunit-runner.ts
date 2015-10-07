require("lie/polyfill");
import * as QUnit from "qunitjs";
import * as cli from "cli-color";
import * as moment from "moment";
import { Browser, create as createBrowser } from "../node-slimer/node-slimer";
import * as Rx from "rx";
import {TestConfig} from "../webpack/test-config";
import * as fs from "fs";
import * as path from "path";
import { setupRunner } from "./qunit-runner";

export function runNode(exitOneOnFailures = false) {
  var busyProcess = setInterval(()=> null, 1000000);

  setupRunner(process.stdout.write.bind(process.stdout), (success) => {
    clearInterval(busyProcess);
    if (exitOneOnFailures && !success) {
      process.exit(1);
    }
  });

  QUnit.load();
}

export function runSlimer(paths:string[], exitOneOnFailures = false) {
  var webpack = require('webpack');
  var config = new TestConfig();

  paths.forEach(path => config.addTests(path));
  var compiler = webpack(config);

  var testJs:string;
  var buildTests = Rx.Observable.fromNodeCallback<any>(compiler.run, compiler);
  var runningBrowser:Browser;

  return buildTests().flatMap(() => {
    var compilerFs = compiler.outputFileSystem as typeof fs;
    if (compilerFs.readFileSync == null) {
      compilerFs.readFileSync = fs.readFileSync.bind(fs);
    }

    var testBundleOutpath = path.join(config.output.path, "tests.js");
    testJs = compilerFs.readFileSync(testBundleOutpath, "utf8");

    return createBrowser()
  }).flatMap((browser) => {
    runningBrowser = browser;
    return browser.createPage();
  }).flatMap((page) => {
    page.onCallback = ((data:any) => {
      switch (data.method) {
        case 'errorToNode':
          console.error(data.message);
          break;
        case 'writeToNode':
          process.stdout.write(data.message);
          break;
        case 'testsDone':
          runningBrowser.exit().subscribe(() => {
            if (exitOneOnFailures && !data.success) {
              process.exit(1);
            }
          });
      }
    });

    console.log("loading js into browser...");
    return page.evaluateJavascript(testJs);
  }).subscribe(() => {
  }, (e) => {
    if (runningBrowser) runningBrowser.exit();
    console.error(e.stack || e + "");
  });
}
