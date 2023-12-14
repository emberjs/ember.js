declare module '@ember/-internals/metal/lib/computed_cache' {
  export function getCachedValueFor<T, K extends keyof T>(obj: T, key: K): T[K] | undefined;
  export function getCachedValueFor(obj: object, key: string): unknown;
}
