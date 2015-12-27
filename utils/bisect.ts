export function bisect<T> (val:T, array:T[], comparator?:(a:T, b:T) => number, favorRight?:boolean) {
  var l = 0, length = array.length, r = length;
  if (length === 0) {
    return 0;
  }

  while (l < r) {
    var m = l + r >>> 1;


    if (favorRight) {
      if (comparator(val, array[m]) < 0) {
        r = m;
      } else {
        l = m + 1;
      }
    } else {
      if (comparator(array[m], val) < 0) {
        l = m + 1;
      } else {
        r = m;
      }
    }
  }

  return l;
}

export function bisectStrings(val:string, array:string[], favorRight?:boolean) {
  return bisect<string>(val, array, (a, b) => a == b ? 0 : (a < b ? -1 : 1), favorRight);
}

export function bisectNumbers(val:number, array:number[], favorRight?:boolean) {
  return bisect<number>(val, array, (a, b) => a - b, favorRight);
}
