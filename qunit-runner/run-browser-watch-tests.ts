import {TestConfig} from "../webpack/test-config";
import { findRecursiveTestFiles, BROWSER_TEST_REG } from "./test-finder";
require('lie/polyfill');

var config = new TestConfig();
config.watch = true;
findRecursiveTestFiles(BROWSER_TEST_REG).toArray().subscribe((files) => {
  files.forEach(f => config.addTests(f.fileName));

  var webpack = require('webpack');
  var compiler = webpack(config);

  setInterval(()=> {
  }, 1000000);

  compiler.watch({}, function (err:any) {
    console.log("rebuilt");
    if (err) {
      console.error(err.message);
    }
  });
}, (e:any) => {
  console.error(e.stack || e + "");
});
