declare module '@ember/-internals/metal/lib/each_proxy_events' {
  export const EACH_PROXIES: WeakMap<object, any>;
  export function eachProxyArrayWillChange(
    array: any,
    idx: number,
    removedCnt: number,
    addedCnt: number
  ): void;
  export function eachProxyArrayDidChange(
    array: any,
    idx: number,
    removedCnt: number,
    addedCnt: number
  ): void;
}
