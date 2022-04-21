export type AnyFn = (...args: any[]) => any;

export type MethodNamesOf<T> = {
  [K in keyof T]: T[K] extends AnyFn ? K : never;
}[keyof T];

export type OmitFirst<F> = F extends [any, ...infer R] ? R : [];
