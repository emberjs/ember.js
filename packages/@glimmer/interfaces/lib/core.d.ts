export type Opaque = {} | void | null | undefined;
export type Option<T> = T | null;
export type Maybe<T> = Option<T> | undefined | void;
export type FIXME<T, S extends string> = T;
export type unsafe = any;

export interface Dict<T> {
  [key: string]: T;
}
