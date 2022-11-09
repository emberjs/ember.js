declare module 'ember/-private/type-utils' {
  // These are utility types used throughout the Ember type definitions. They
  // should *never* be used in end user code.

  /** A safe-ish type representing any function. */
  export type AnyFn = (...args: any[]) => unknown;

  export type AnyMethod<Target> = (this: Target, ...args: any[]) => unknown;

  // The formatting here is designed to help make this type actually be
  // comprehensible to mortals, including the mortals who came up with it.
  // prettier-ignore
  export type MethodsOf<T> = {
    // This `keyof` check is the thing which gives us *only* these keys, and no
    // `foo: never` appears in the final type.
    [K in keyof T as T[K] extends AnyFn ? K : never]:
      // While this makes sure the resolved type only has `AnyFn` in it, so that
      // the resulting type is known to be only function types.
      T[K] extends AnyFn ? T[K] : never;
  };

  export type MethodNamesOf<T> = keyof MethodsOf<T>;

  export type MethodParams<T, M extends MethodNamesOf<T>> = Parameters<MethodsOf<T>[M]>;

  export type MethodReturns<T, M extends MethodNamesOf<T>> = ReturnType<MethodsOf<T>[M]>;

  // prettier-ignore
  /** Get the return value of a method string name or a function. */
  export type EmberMethodParams<T, M extends EmberMethod<T>> =
    // For a basic method, we can just use the direct accessor.
    M extends AnyMethod<T> ? Parameters<M> :
    M extends MethodNamesOf<T> ? Parameters<MethodsOf<T>[M]> : never;

  // prettier-ignore
  /** Get the return value of a method string name or a function. */
  export type EmberMethodReturn<T, M extends EmberMethod<T>> =
    M extends AnyMethod<T> ? ReturnType<M> :
    M extends MethodNamesOf<T> ? ReturnType<MethodsOf<T>[M]> : never;

  /**
   * A type utility for Ember's common name-of-object-on-target-or-function
   * pattern for e.g. event handlers.
   */
  export type EmberMethod<Target> = AnyMethod<Target> | keyof Target;

  // A way of representing non-user-constructible types. You can conveniently use
  // this by doing `interface Type extends Data<'some-type-name'> { ... }` for
  // simple types, and/or you can type-parameterize it as makes sense for your use
  // case (see e.g. `@ember/component/helper`'s use with functional helpers).
  const Data: unique symbol;
  export class Opaque<Data> {
    private declare [Data]: Data;
  }

  export {};
}
