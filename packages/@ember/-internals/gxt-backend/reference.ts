/**
 * GXT-backend shim for @glimmer/reference.
 *
 * Near-verbatim port of classic `@glimmer/reference/lib/reference.ts` and
 * `@glimmer/reference/lib/iterable.ts`, backed by our local `@glimmer/validator`
 * shim which provides classic-style `track/consumeTag/validateTag/valueForTag`.
 *
 * Back-compat: existing consumers that treat refs as plain gxt cells read
 * `.value` directly and call `.update(val)`. ReferenceImpl exposes both.
 */

import { getPath, getProp, setProp, toIterator } from '@glimmer/global-context';
import { dict, EMPTY_ARRAY, isDict, isIndexable } from '@glimmer/util';
import {
  CONSTANT_TAG,
  consumeTag,
  createTag,
  dirtyTag,
  INITIAL,
  track,
  validateTag,
  valueForTag,
} from '@glimmer/validator';

// ---------------- types / constants ----------------

export const REFERENCE: symbol = Symbol('REFERENCE');

const CONSTANT = 0 as const;
const COMPUTE = 1 as const;
const UNBOUND = 2 as const;
const INVOKABLE = 3 as const;

type ReferenceType = 0 | 1 | 2 | 3;

export interface ReferenceEnvironment {
  getProp(obj: unknown, path: string): unknown;
  setProp(obj: unknown, path: string, value: unknown): unknown;
}

export interface Reference<T = unknown> {
  [REFERENCE]: ReferenceType;
  debugLabel?: string;
  readonly value: T;
  update(value: T): void;
}

// ---------------- ReferenceImpl ----------------

class ReferenceImpl<T = unknown> implements Reference<T> {
  [REFERENCE]: ReferenceType;

  public tag: any = null;
  public lastRevision: number = INITIAL;
  public lastValue: T | undefined = undefined;

  public compute: (() => T) | null = null;
  public updateFn: ((val: T) => void) | null = null;

  public children: Map<string | Reference, Reference> | null = null;

  public debugLabel?: string;

  constructor(type: ReferenceType) {
    this[REFERENCE] = type;
  }

  get value(): T {
    return valueForRef(this as unknown as Reference<T>);
  }

  update(val: T): void {
    if (this.updateFn !== null) {
      this.updateFn(val);
    }
  }
}

// ---------------- core constructors ----------------

export function createPrimitiveRef<
  T extends string | symbol | number | boolean | null | undefined,
>(value: T): Reference<T> {
  const ref = new ReferenceImpl<T>(UNBOUND);
  ref.tag = CONSTANT_TAG;
  ref.lastValue = value;
  ref.debugLabel = String(value);
  return ref;
}

export const UNDEFINED_REFERENCE: Reference<undefined> = createPrimitiveRef(undefined);
export const NULL_REFERENCE: Reference<null> = createPrimitiveRef(null);
export const TRUE_REFERENCE: Reference<true> = createPrimitiveRef(true as const);
export const FALSE_REFERENCE: Reference<false> = createPrimitiveRef(false as const);

export function createConstRef<T>(value: T, debugLabel: false | string = 'const'): Reference<T> {
  const ref = new ReferenceImpl<T>(CONSTANT);
  ref.lastValue = value;
  ref.tag = CONSTANT_TAG;
  if (typeof debugLabel === 'string') ref.debugLabel = debugLabel;
  return ref;
}

export function createUnboundRef<T>(
  value: T,
  debugLabel: false | string = 'unbound'
): Reference<T> {
  const ref = new ReferenceImpl<T>(UNBOUND);
  ref.lastValue = value;
  ref.tag = CONSTANT_TAG;
  if (typeof debugLabel === 'string') ref.debugLabel = debugLabel;
  return ref;
}

export function createComputeRef<T = unknown>(
  compute: () => T,
  update: ((value: T) => void) | null = null,
  debugLabel: false | string = 'unknown'
): Reference<T> {
  const ref = new ReferenceImpl<T>(COMPUTE);
  ref.compute = compute;
  ref.updateFn = update;
  if (typeof debugLabel === 'string') {
    ref.debugLabel = `(result of a \`${debugLabel}\` helper)`;
  }
  return ref;
}

export function createReadOnlyRef(ref: Reference): Reference {
  if (!isUpdatableRef(ref)) return ref;
  return createComputeRef(() => valueForRef(ref), null, ref.debugLabel);
}

export function isInvokableRef(ref: Reference): boolean {
  return ref[REFERENCE] === INVOKABLE;
}

export function createInvokableRef(inner: Reference): Reference {
  const ref = createComputeRef(
    () => valueForRef(inner),
    (value) => updateRef(inner, value)
  );
  (ref as any).debugLabel = inner.debugLabel;
  (ref as ReferenceImpl)[REFERENCE] = INVOKABLE;
  return ref;
}

export function isConstRef(ref: Reference): boolean {
  return (ref as ReferenceImpl).tag === CONSTANT_TAG;
}

export function isUpdatableRef(ref: Reference): boolean {
  return (ref as ReferenceImpl).updateFn !== null;
}

// ---------------- valueForRef / updateRef ----------------

export function valueForRef<T>(_ref: Reference<T>): T {
  const ref = _ref as ReferenceImpl<T>;

  let tag = ref.tag;

  if (tag === CONSTANT_TAG) {
    return ref.lastValue as T;
  }

  const lastRevision = ref.lastRevision;
  let lastValue: T | undefined;

  let valid = false;
  if (tag !== null) {
    try {
      valid = validateTag(tag, lastRevision);
    } catch {
      valid = false;
    }
  }

  if (!valid) {
    const compute = ref.compute;
    if (compute === null) {
      return ref.lastValue as T;
    }

    let newTag: any;
    try {
      newTag = track(() => {
        lastValue = ref.lastValue = compute();
      });
    } catch {
      // If track() blows up (e.g. due to combinator/cycle issues in the
      // validator shim), fall back to a raw compute without caching.
      lastValue = ref.lastValue = compute();
      newTag = null;
    }

    tag = ref.tag = newTag;
    try {
      ref.lastRevision = newTag == null ? INITIAL : valueForTag(newTag);
    } catch {
      ref.lastRevision = INITIAL;
    }
  } else {
    lastValue = ref.lastValue;
  }

  if (tag !== null) {
    try {
      consumeTag(tag);
    } catch {
      /* best-effort: consumeTag may choke on exotic combinator tags */
    }
  }
  return lastValue as T;
}

export function updateRef(_ref: Reference, value: unknown): void {
  const ref = _ref as ReferenceImpl;
  const update = ref.updateFn;
  if (update === null || update === undefined) {
    throw new Error('called update on a non-updatable reference');
  }
  update(value);
}

// ---------------- childRefFor / childRefFromParts ----------------

export function childRefFor(_parentRef: Reference, path: string): Reference {
  const parentRef = _parentRef as ReferenceImpl;
  const type = parentRef[REFERENCE];

  let children = parentRef.children;
  let child: Reference;

  if (children === null) {
    children = parentRef.children = new Map();
  } else {
    const next = children.get(path);
    if (next) return next;
  }

  if (type === UNBOUND) {
    const parent = valueForRef(parentRef);
    if (isDict(parent)) {
      child = createUnboundRef(
        (parent as Record<string, unknown>)[path],
        `${parentRef.debugLabel ?? 'unbound'}.${path}`
      );
    } else {
      child = UNDEFINED_REFERENCE;
    }
  } else {
    child = createComputeRef(
      () => {
        const parent = valueForRef(parentRef);
        if (isDict(parent)) {
          if (typeof getProp === 'function') {
            return getProp(parent as object, path);
          }
          return (parent as Record<string, unknown>)[path];
        }
        return undefined;
      },
      (val) => {
        const parent = valueForRef(parentRef);
        if (isDict(parent)) {
          if (typeof setProp === 'function') {
            return setProp(parent as object, path, val);
          }
          (parent as Record<string, unknown>)[path] = val;
        }
      }
    );
    (child as any).debugLabel = `${parentRef.debugLabel ?? 'ref'}.${path}`;
  }

  children.set(path, child);
  return child;
}

export function childRefFromParts(root: Reference, parts: string[]): Reference {
  let ref = root;
  for (const part of parts) {
    ref = childRefFor(ref, part);
  }
  return ref;
}

// ---------------- createDebugAliasRef ----------------

export const createDebugAliasRef = (debugLabel: string, inner: Reference): Reference => {
  const update = isUpdatableRef(inner)
    ? (value: unknown): void => updateRef(inner, value)
    : null;
  const ref = createComputeRef(() => valueForRef(inner), update);
  (ref as ReferenceImpl)[REFERENCE] = (inner as ReferenceImpl)[REFERENCE];
  (ref as any).debugLabel = debugLabel;
  return ref;
};

// ==================================================================
//                        IterableReference
// ==================================================================

export interface IterationItem<T, U> {
  key: unknown;
  value: T;
  memo: U;
}

export interface AbstractIterator<T, U, V extends IterationItem<T, U>> {
  isEmpty(): boolean;
  next(): V | null;
}

export type OpaqueIterationItem = IterationItem<unknown, unknown>;
export type OpaqueIterator = AbstractIterator<unknown, unknown, OpaqueIterationItem>;

export interface IteratorDelegate {
  isEmpty(): boolean;
  next(): { value: unknown; memo: unknown } | null;
}

type KeyFor = (item: unknown, index: unknown) => unknown;

const NULL_IDENTITY = {};

const KEY: KeyFor = (_, index) => index;
const INDEX: KeyFor = (_, index) => String(index);
const IDENTITY: KeyFor = (item) => {
  if (item === null) return NULL_IDENTITY;
  return item;
};

function keyForPath(path: string): KeyFor {
  if (path[0] === '@') {
    throw new Error(
      `invalid keypath: '${path}', valid keys: @index, @identity, or a path`
    );
  }
  return uniqueKeyFor((item) => getPath(item as object, path));
}

function makeKeyFor(key: string): KeyFor {
  switch (key) {
    case '@key':
      return uniqueKeyFor(KEY);
    case '@index':
      return uniqueKeyFor(INDEX);
    case '@identity':
      return uniqueKeyFor(IDENTITY);
    default:
      return keyForPath(key);
  }
}

class WeakMapWithPrimitives<T> {
  private _weakMap?: WeakMap<object, T>;
  private _primitiveMap?: Map<unknown, T>;

  private get weakMap(): WeakMap<object, T> {
    if (this._weakMap === undefined) this._weakMap = new WeakMap();
    return this._weakMap;
  }

  private get primitiveMap(): Map<unknown, T> {
    if (this._primitiveMap === undefined) this._primitiveMap = new Map();
    return this._primitiveMap;
  }

  set(key: unknown, value: T): void {
    if (isIndexable(key)) {
      this.weakMap.set(key as object, value);
    } else {
      this.primitiveMap.set(key, value);
    }
  }

  get(key: unknown): T | undefined {
    if (isIndexable(key)) {
      return this.weakMap.get(key as object);
    } else {
      return this.primitiveMap.get(key);
    }
  }
}

const IDENTITIES = new WeakMapWithPrimitives<object[]>();

function identityForNthOccurence(value: unknown, count: number): object {
  let identities = IDENTITIES.get(value);
  if (identities === undefined) {
    identities = [];
    IDENTITIES.set(value, identities);
  }
  let identity = identities[count];
  if (identity === undefined) {
    identity = { value, count } as object;
    identities[count] = identity;
  }
  return identity;
}

function uniqueKeyFor(keyFor: KeyFor): KeyFor {
  const seen = new WeakMapWithPrimitives<number>();
  return (value: unknown, memo: unknown) => {
    const key = keyFor(value, memo);
    const count = seen.get(key) || 0;
    seen.set(key, count + 1);
    if (count === 0) return key;
    return identityForNthOccurence(key, count);
  };
}

export function createIteratorRef(listRef: Reference, key: string): Reference {
  return createComputeRef(() => {
    const iterable = valueForRef(listRef) as any;
    const keyFor = makeKeyFor(key);

    if (Array.isArray(iterable)) {
      return new ArrayIterator(iterable, keyFor);
    }

    const maybeIterator = toIterator ? toIterator(iterable) : null;

    if (maybeIterator === null || maybeIterator === undefined) {
      return new ArrayIterator(EMPTY_ARRAY as unknown[], () => null);
    }

    return new IteratorWrapper(maybeIterator, keyFor);
  });
}

export function createIteratorItemRef(_value: unknown): Reference {
  let value = _value;
  const tag = createTag();

  return createComputeRef(
    () => {
      consumeTag(tag);
      return value;
    },
    (newValue) => {
      if (value !== newValue) {
        value = newValue;
        dirtyTag(tag);
      }
    }
  );
}

class IteratorWrapper implements OpaqueIterator {
  constructor(
    private inner: IteratorDelegate,
    private keyFor: KeyFor
  ) {}

  isEmpty(): boolean {
    return this.inner.isEmpty();
  }

  next(): OpaqueIterationItem | null {
    const nextValue = this.inner.next() as OpaqueIterationItem | null;
    if (nextValue !== null) {
      nextValue.key = this.keyFor(nextValue.value, nextValue.memo);
    }
    return nextValue;
  }
}

class ArrayIterator implements OpaqueIterator {
  private current:
    | { kind: 'empty' }
    | { kind: 'first'; value: unknown }
    | { kind: 'progress' };
  private pos = 0;

  constructor(
    private iterator: unknown[] | readonly unknown[],
    private keyFor: KeyFor
  ) {
    if (iterator.length === 0) {
      this.current = { kind: 'empty' };
    } else {
      this.current = { kind: 'first', value: iterator[this.pos] };
    }
  }

  isEmpty(): boolean {
    return this.current.kind === 'empty';
  }

  next(): IterationItem<unknown, number> | null {
    let value: unknown;
    const current = this.current;
    if (current.kind === 'first') {
      this.current = { kind: 'progress' };
      value = current.value;
    } else if (this.pos >= this.iterator.length - 1) {
      return null;
    } else {
      value = this.iterator[++this.pos];
    }

    const key = this.keyFor(value, this.pos);
    const memo = this.pos;
    return { key, value, memo };
  }
}

// Re-export dict for legacy callers that imported it through this shim path.
export { dict };
