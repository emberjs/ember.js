export type Present = {} | void;
export type Option<T> = T | null;
export type Maybe<T> = Option<T> | undefined | void;
export type FIXME<T, S extends string> = T;

export interface Dict<T = unknown> {
  [key: string]: T;
}

export interface Unique<T> {
  'Unique [id=ada0f31f-27f7-4ab0-bc03-0005387c9d5f]': T;
}

export type Recast<T, U> = (T & U) | U;

/**
 * This is needed because the normal IteratorResult in the TypeScript
 * standard library is generic over the value in each tick and not over
 * the return value. It represents a standard ECMAScript IteratorResult.
 */
export type RichIteratorResult<Tick, Return> =
  | {
      done: false;
      value: Tick;
    }
  | {
      done: true;
      value: Return;
    };

export type Destroyable = object;
export type Destructor<T extends Destroyable> = (destroyable: T) => void;
