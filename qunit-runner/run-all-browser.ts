import * as runner from "./node-qunit-runner";
import { findRecursiveTestFiles, BROWSER_TEST_REG } from "./test-finder";

findRecursiveTestFiles(BROWSER_TEST_REG).toArray().subscribe((files) => {
  runner.runSlimer(files.map(f => f.fileName), true)
}, (e:any) => {
  console.error(e.stack || e + "");
});
