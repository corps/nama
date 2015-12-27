import * as runner from "./node-qunit-runner";
import { findRecursiveTestFiles, FileDetails, BROWSER_TEST_REG } from "./test-finder";

findRecursiveTestFiles(BROWSER_TEST_REG).scan<FileDetails>((bestSoFar, next) => {
  if (bestSoFar == null || next.lastModified > bestSoFar.lastModified) {
    return next;
  }
  return bestSoFar;
}).takeLast(1).subscribe((nextFile) => {
  runner.runSlimer([nextFile.fileName]);
}, console.error);