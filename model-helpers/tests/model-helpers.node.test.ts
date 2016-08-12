import * as QUnit from "qunitjs";
import {
  invalidObj, deserializeByExample,
  assignFromJson, arrayOf, arrayWithSome
} from "../model-helpers";

QUnit.module(__filename);

class ChildObj {
  a = 0;
  b = "";
}

class ParentObj {
  a = "";
  child = new ChildObj();
}

class ObjWithArray {
  objs = arrayOf(ParentObj);
  strings = arrayWithSome("");
}

class ObjWithMethodsAndPrototypeValues {
  thing() {
  }

  value:string;
}

ObjWithMethodsAndPrototypeValues.prototype.value = "";

QUnit.test("assignFromJson fails for non objects", (assert) => {
  assert.equal(assignFromJson({}, {}), true);
  assert.equal(assignFromJson(3, {}), false);
  assert.equal(assignFromJson({}, 3), false);
  assert.equal(assignFromJson("", {}), false);
  assert.equal(assignFromJson({}, ""), false);
  assert.equal(assignFromJson([], {}), false);
  assert.equal(assignFromJson({}, []), false);
  assert.equal(assignFromJson(null, {}), false);
  assert.equal(assignFromJson({}, null), false);
});

QUnit.test("assignFromJson handles nulling out child objects", (assert) => {
  var obj = new ParentObj();
  var src = new ParentObj();
  src.child = null;

  assert.equal(assignFromJson(obj, JSON.parse(JSON.stringify(src))), true);
  assert.equal(obj.child, null);
});

QUnit.test("deserializeByExample handles Dates", (assert) => {
  assert.equal(deserializeByExample(new Date(), "not a date"), invalidObj);
  assert.equal(deserializeByExample(new Date(), {}), invalidObj);
  assert.deepEqual(deserializeByExample(new Date(), 111), new Date(111));
  assert.deepEqual(deserializeByExample(new Date(), "1970-01-01T00:00:00.111Z"), new Date(111));
});

QUnit.test("deserializeByExample handles strings", (assert) => {
  assert.equal(deserializeByExample("", 123), invalidObj);
  assert.equal(deserializeByExample("", "some text"), "some text");
});

QUnit.test("deserializeByExample handles numbers", (assert) => {
  assert.equal(deserializeByExample(1, 123), 123);
  assert.equal(deserializeByExample(1, "some text"), invalidObj);
});

QUnit.test("deserializeByExample handles booleans", (assert) => {
  assert.equal(deserializeByExample(true, true), true);
  assert.equal(deserializeByExample(true, 1), invalidObj);
});

QUnit.test("deserializeByExample recursively handles objects by constructing and assigning",
  (assert) => {
    var obj = new ParentObj();

    var result = deserializeByExample(obj, {a: "moo", child: {a: 6}});
    assert.notEqual(result, obj);
    assert.deepEqual(JSON.parse(JSON.stringify(obj)), {a: "", child: {a: 0, b: ""}});
    assert.deepEqual(JSON.parse(JSON.stringify(result)), {a: "moo", child: {a: 6, b: ""}});
  });

QUnit.test("deserializeByExample recursively handles arrays by creating instances and assign in",
  (assert) => {
    var array:any[] = arrayOf(ParentObj);
    var result = deserializeByExample(array, [{}, {child: {b: "c"}}]);
    assert.notEqual(result, array);
    assert.deepEqual(array, []);
    assert.deepEqual(JSON.parse(JSON.stringify(result)), [
      {a: "", child: {a: 0, b: ""}},
      {a: "", child: {a: 0, b: "c"}}
    ]);

    array = arrayWithSome(new Date());
    result = deserializeByExample(array, [111, "1970-01-01T00:00:00.151Z"]);
    assert.notEqual(result, array);
    assert.deepEqual(array, []);
    assert.deepEqual(result, [
      new Date(111),
      new Date(151),
    ]);
  });

QUnit.test("deserializeByExample rejects an array if any element fails",
  (assert) => {
    assert.equal(deserializeByExample(arrayWithSome(0), [1, 2, 3, ""]), invalidObj);
  });

QUnit.test("deserializeByExample rejects non arrays into arrays",
  (assert) => {
    assert.equal(deserializeByExample(arrayOf(ParentObj), {}), invalidObj);
    assert.equal(deserializeByExample(arrayOf(ParentObj), ""), invalidObj);
  });

QUnit.test("assignFromJson returns false on unassignable attributes", (assert) => {
  assert.equal(assignFromJson(new ParentObj(), {a: 1}), false);
});

QUnit.test("assignFromJson ignores assigning properties not from the example", (assert) => {
  var obj = new ParentObj();
  assert.equal(assignFromJson(obj, {notone: false}), true);
  assert.notOk("notone" in obj)
});

QUnit.test("assignFromJson ignores assigning properties not from the example", (assert) => {
  var obj = new ParentObj();
  assert.equal(assignFromJson(obj, {notone: false}), true);
  assert.notOk("notone" in obj)
});

QUnit.test("assignFromJson ignores assignments into methods or values from the prototype",
  (assert) => {
    var obj = new ObjWithMethodsAndPrototypeValues();
    assert.equal(assignFromJson(obj, {value: 1, thing: 4}), true);
    assert.notOk(obj.hasOwnProperty("value"));
    assert.notOk(obj.hasOwnProperty("thing"));
  });

QUnit.test("loading an array", (assert) => {
  var obj = new ObjWithArray();
  assert.equal(assignFromJson(obj, {strings: ["one", "two"], objs: [{child: {a: 1}}]}), true);
  assert.deepEqual(JSON.parse(JSON.stringify(obj)),
    {"objs": [{"a": "", "child": {"a": 1, "b": ""}}], "strings": ["one", "two"]});
})
