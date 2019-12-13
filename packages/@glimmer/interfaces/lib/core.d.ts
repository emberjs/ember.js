export type Present = {} | void;
export type Option<T> = T | null;
export type Maybe<T> = Option<T> | undefined | void;
export type FIXME<T, S extends string> = T;
export type unsafe = any;

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

export interface Destroyable {
  destroy(): void;
  willDestroy?(): void;
}

declare const DestroySymbol: unique symbol;
export type DestroySymbol = typeof DestroySymbol;

export interface SymbolDestroyable {
  [DestroySymbol](): void;
}

declare const WillDropSymbol: unique symbol;
export type WillDropSymbol = typeof WillDropSymbol;
declare const DidDropSymbol: unique symbol;
export type DidDropSymbol = typeof DidDropSymbol;
declare const ChildrenSymbol: unique symbol;
export type ChildrenSymbol = typeof ChildrenSymbol;

export interface Drop {
  [WillDropSymbol](): void;
  [DidDropSymbol](): void;

  // Debug only
  [ChildrenSymbol]: Iterable<Drop>;
}
