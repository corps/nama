export function assignFromJson(obj:any, json:any) {
  if (obj == null || obj instanceof Array || !(typeof obj === "object")) {
    return false;
  }

  if (json == null || json instanceof Array || !(typeof json === "object")) {
    return false;
  }

  for (var key in obj) {
    if (!obj.hasOwnProperty(key)) continue;
    if (typeof obj[key] === "function") continue;
    if (!(key in json)) continue;

    let example = obj[key];
    let newValue = deserializeByExample(example, json[key]);
    if (newValue === invalidObj) {
      return false
    }
    obj[key] = newValue;
  }

  return true;
}

export var invalidObj = {};
export function deserializeByExample(example:any, value:any) {
  if (example == null || value == null) return invalidObj;
  if (example instanceof Date) {
    value = new Date(value);
    if (value.toString() === "Invalid Date") return invalidObj;
  } else if (typeof example === "number") {
    if (isNaN(value) || typeof value !== "number") return invalidObj
  } else if (typeof example === "boolean") {
    if (typeof value !== "boolean") return invalidObj;
  } else if (typeof example === "string") {
    if (typeof value !== "string") return invalidObj;
  } else if (example instanceof Array) {
    if (!(value instanceof Array)) return invalidObj;
    var elementExample = example.exampleElement;
    if (elementExample == null) return invalidObj;
    var newArray:any[] = [];
    for (var val of value) {
      var next = deserializeByExample(elementExample, val);
      if (next === invalidObj) {
        return invalidObj;
      }
      newArray.push(next);
    }
    value = newArray;
  } else {
    var copy = new example.constructor();
    if (!assignFromJson(copy, value)) return invalidObj;
    value = copy;
  }

  return value;
}

export function arrayOf<T>(ctor:{ new(): T}):T[] {
  var result = [] as T[];
  (result as any).exampleElement = new ctor();
  return result;
}

export function arrayWithSome<T>(example:T):T[] {
  var result = [] as T[];
  (result as any).exampleElement = example;
  return result;
}
