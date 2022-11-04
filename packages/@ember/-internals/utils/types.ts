export type AnyFn = (...args: any[]) => any;

export type MethodNamesOf<T> = {
  [K in keyof T]: T[K] extends AnyFn ? K : never;
}[keyof T];

export type MethodsOf<O> = Pick<O, MethodNamesOf<O>>;

export type MethodParams<T, M extends MethodNamesOf<T>> = Parameters<MethodsOf<T>[M]>;

export type MethodReturns<T, M extends MethodNamesOf<T>> = ReturnType<MethodsOf<T>[M]>;

export type OmitFirst<F> = F extends [any, ...infer R] ? R : [];
