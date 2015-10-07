import * as runner from "./node-qunit-runner";
import { findRecursiveTestFiles, NODE_TEST_REG } from "./test-finder";

findRecursiveTestFiles(NODE_TEST_REG).subscribe((nextFile) => {
  require(nextFile.fileName);
}, console.error, () => {
  runner.runNode();
});