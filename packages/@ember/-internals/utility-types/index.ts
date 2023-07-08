export type AnyFn = (...args: any[]) => any;

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

export type OmitFirst<F> = F extends [any, ...infer R] ? R : [];

// A way of representing non-user-constructible types. You can conveniently use
// this by doing `interface Type extends Opaque<'some-type-name'> { ... }` for
// simple types, and/or you can type-parameterize it as makes sense for your use
// case (see e.g. `@ember/component/helper`'s use with functional helpers).
declare const Data: unique symbol;
export class Opaque<Data> {
  private declare [Data]: Data;
}
