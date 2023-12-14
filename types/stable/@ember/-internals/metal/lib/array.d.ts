declare module '@ember/-internals/metal/lib/array' {
  import type EmberArray from '@ember/array';
  import type MutableArray from '@ember/array/mutable';
  type ObservedArray<T> = (T[] | EmberArray<T>) & ObservedObject;
  interface ObservedObject {
    _revalidate?: () => void;
  }
  export function objectAt<T>(array: T[] | EmberArray<T>, index: number): T | undefined;
  export function replace<T>(
    array: T[] | MutableArray<T>,
    start: number,
    deleteCount: number,
    items?: readonly T[]
  ): void;
  export function replaceInNativeArray<T>(
    array: T[],
    start: number,
    deleteCount: number,
    items: ReadonlyArray<T>
  ): void;
  interface ArrayObserverOptions {
    willChange: string;
    didChange: string;
  }
  export function addArrayObserver<T>(
    array: EmberArray<T>,
    target: object | Function | null,
    opts: ArrayObserverOptions
  ): ObservedArray<T>;
  export function removeArrayObserver<T>(
    array: T[] | EmberArray<T>,
    target: object | Function | null,
    opts: ArrayObserverOptions
  ): ObservedArray<T>;
  export {};
}
