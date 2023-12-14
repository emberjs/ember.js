declare module '@ember/-internals/metal/lib/array_events' {
  export function arrayContentWillChange<T extends object>(
    array: T,
    startIdx: number,
    removeAmt: number,
    addAmt: number
  ): T;
  export function arrayContentDidChange<
    T extends {
      length: number;
    }
  >(array: T, startIdx: number, removeAmt: number, addAmt: number, notify?: boolean): T;
}
