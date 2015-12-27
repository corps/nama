import * as runner from "./node-qunit-runner";
import { findRecursiveTestFiles, FileDetails, NODE_TEST_REG } from "./test-finder";

findRecursiveTestFiles(NODE_TEST_REG).scan<FileDetails>((bestSoFar, next) => {
  if (bestSoFar == null || next.lastModified > bestSoFar.lastModified) {
    return next;
  }
  return bestSoFar;
}).takeLast(1).subscribe((nextFile) => {
  require(nextFile.fileName);
}, console.error, () => {
  runner.runNode();
});