const EMBER_ARRAYS = new WeakSet();
export function setEmberArray(obj) {
  EMBER_ARRAYS.add(obj);
}
export function isEmberArray(obj) {
  return EMBER_ARRAYS.has(obj);
}