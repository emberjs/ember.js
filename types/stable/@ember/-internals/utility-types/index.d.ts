declare module '@ember/-internals/utility-types' {
  export type AnyFn = (...args: any[]) => any;
  export type MethodsOf<T> = {
    [K in keyof T as T[K] extends AnyFn ? K : never]: T[K] extends AnyFn ? T[K] : never;
  };
  export type MethodNamesOf<T> = keyof MethodsOf<T>;
  export type MethodParams<T, M extends MethodNamesOf<T>> = Parameters<MethodsOf<T>[M]>;
  export type MethodReturns<T, M extends MethodNamesOf<T>> = ReturnType<MethodsOf<T>[M]>;
  export type OmitFirst<F> = F extends [any, ...infer R] ? R : [];
  const Data: unique symbol;
  export class Opaque<Data> {
    private [Data];
  }
  export type Nullable<T> = T | null;
  export {};
}
