export function referenceDiffs(previous:any, next:any) {
  if (previous == next) {
    return undefined;
  }

  if (previous == null) {
    return "^^" + next;
  }

  if (next == null) {
    return "$$" + previous;
  }

  if (previous.constructor !== next.constructor) {
    return next;
  }

  if (previous instanceof Array) {
    var arrayResult = [] as any[];

    var i = 0;
    for (; i < previous.length; ++i) {
      if (previous[i] == next[i]) {
        continue;
      }

      arrayResult.push([i, referenceDiffs(previous[i], next[i])])
    }

    for (; i < next.length; ++i) {
      arrayResult.push([i, referenceDiffs(undefined, next[i])])
    }

    return arrayResult;
  }

  if (previous instanceof Object) {
    var objResult = {} as any;
    for (var key of Object.keys(previous)) {
      var previousValue = previous[key];
      var nextValue = next[key];
      if (nextValue == previousValue) {
        continue;
      }

      objResult[key] = referenceDiffs(previousValue, nextValue);
    }
    return objResult;
  }

  return next;
}
