const MAX_INTEGER = 9007199254740991;

export function sortableStringOfInteger(n:number) {
  if(n === 0) return "0-0";
  n = Math.min(Math.floor(n), MAX_INTEGER);
  return Math.floor(Math.log(n) / Math.LN10).toString(36) + "-" + n;
}

export function numberReverseOrdered(n:number) {
  return MAX_INTEGER - n;
}