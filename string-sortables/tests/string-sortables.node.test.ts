import * as QUnit from "qunitjs";
import { sortableStringOfInteger } from "../string-sortables";

QUnit.module(__filename);

QUnit.test("#sortableStringOfInteger", (assert) => {
  var numbers = [] as number[];
  for (var i = 0; i < 100; ++i) {
    numbers.push(Math.floor(Math.random() * 10000));
  }

  var sortableAsStrings = numbers.map(sortableStringOfInteger);

  assert.ok(sortableStringOfInteger(0) < sortableStringOfInteger(1));
  assert.deepEqual(sortableAsStrings.sort(),
    numbers.sort((a, b) => a - b).map(sortableStringOfInteger));
});
