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
}

declare const DestroySymbol: 'DESTROY [fc611582-3742-4845-88e1-971c3775e0b8]';
export type DestroySymbol = typeof DestroySymbol;

export interface SymbolDestroyable {
  [DestroySymbol](): void;
}

declare const DropSymbol: 'DROP [94d46cf3-3974-435d-b278-3e60d1155290]';
export type DropSymbol = typeof DropSymbol;
declare const ChildrenSymbol: 'CHILDREN [7142e52a-8600-4e01-a773-42055b96630d]';
export type ChildrenSymbol = typeof ChildrenSymbol;

export interface Drop {
  [DropSymbol](): void;

  // Debug only
  [ChildrenSymbol]: Iterable<Drop>;
}
