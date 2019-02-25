export const EACH_PROXIES = new WeakMap();

export function eachProxyArrayWillChange(
  array: any,
  idx: number,
  removedCnt: number,
  addedCnt: number
): void {
  let eachProxy = EACH_PROXIES.get(array);
  if (eachProxy !== undefined) {
    eachProxy.arrayWillChange(array, idx, removedCnt, addedCnt);
  }
}

export function eachProxyArrayDidChange(
  array: any,
  idx: number,
  removedCnt: number,
  addedCnt: number
): void {
  let eachProxy = EACH_PROXIES.get(array);
  if (eachProxy !== undefined) {
    eachProxy.arrayDidChange(array, idx, removedCnt, addedCnt);
  }
}
