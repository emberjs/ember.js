export type Opaque = {} | void | null | undefined;
export type Option<T> = T | null;
export type Maybe<T> = Option<T> | undefined | void;
export type FIXME<T, S extends string> = T;
export type unsafe = any;

export interface Dict<T> {
  [key: string]: T;
}

export interface Unique<T> {
  "Unique [id=ada0f31f-27f7-4ab0-bc03-0005387c9d5f]": T;
}

export type Recast<T, U> = (T & U) | U;
