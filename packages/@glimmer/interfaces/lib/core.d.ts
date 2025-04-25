export type Present<T> = Exclude<T, null | undefined>;
export type Nullable<T> = T | null;
export type Optional<T> = T | undefined;
export type Maybe<T> = Nullable<T> | Optional<T>;
export type FIXME<T, _S extends string> = T;

/**
 * A special version of `Optional` that is used for values that are expected to be initialized. This
 * documents the intent that the value will be initialized before it is used, and therefore that
 * null assertions or `?.` are not appropriate.
 */
export type Initializable<T> = T | undefined;

export type Dict<T = unknown> = Record<string, T>;

/**
 * A type that has an index signature, but nothing else is know about it. Useful in generic code
 * that needs to index into an opaque, user-specified object.
 */
export type Indexable = Dict;

export type DictValue<D extends Dict> = D extends Dict<infer V> ? V : never;

export interface Unique<T> {
  'Unique [id=ada0f31f-27f7-4ab0-bc03-0005387c9d5f]': T;
}

export type Recast<T, U> = (T & U) | U;

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export type AnyFn = Function;

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
