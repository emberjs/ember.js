import { cell, formula } from '@lifeart/gxt';
import { reference } from '@lifeart/gxt/glimmer-compatibility';

export const {
  createComputeRef,
  createConstRef,
  createUnboundRef,
  createPrimitiveRef,
  childRefFor,
  valueForRef,
} = reference;

// Symbol to identify reference objects
export const REFERENCE = Symbol('REFERENCE');

// Constant reference values
export const FALSE_REFERENCE = cell(false, 'FALSE_REFERENCE');
export const UNDEFINED_REFERENCE = cell(undefined, 'UNDEFINED_REFERENCE');
export const NULL_REFERENCE = cell(null, 'NULL_REFERENCE');
export const TRUE_REFERENCE = cell(true, 'TRUE_REFERENCE');

// Check if a reference is constant (never changes)
export function isConstRef(ref: any): boolean {
  if (!ref) return false;
  // A const ref has no setter and is not computed
  if (ref === FALSE_REFERENCE || ref === TRUE_REFERENCE ||
      ref === NULL_REFERENCE || ref === UNDEFINED_REFERENCE) {
    return true;
  }
  // Check for isConst flag
  if (ref.isConst === true) return true;
  // Formula-based refs with no dependencies are constant
  if ('fn' in ref && ref.deps && ref.deps.length === 0) {
    return true;
  }
  return false;
}

// Check if a reference can be updated
export function isUpdatableRef(ref: any): boolean {
  if (!ref) return false;
  // Cell-based refs are updatable
  if ('value' in ref && typeof ref.update === 'function') {
    return true;
  }
  // Refs with an update method are updatable
  if (typeof ref.update === 'function') {
    return true;
  }
  // Computed refs are not directly updatable
  if ('fn' in ref) {
    return false;
  }
  return false;
}

// Update the value of an updatable reference
export function updateRef(ref: any, value: any): void {
  if (!ref) return;
  if (typeof ref.update === 'function') {
    ref.update(value);
  } else if ('value' in ref) {
    ref.value = value;
  }
}

// Create a reference from a path on an object
export function childRefFromParts(parentRef: any, parts: string[]) {
  let current = parentRef;
  for (const part of parts) {
    current = childRefFor(current, part);
  }
  return current;
}

// Check if a reference is invokable (can be called as a function)
export function isInvokableRef(ref: any): boolean {
  if (!ref) return false;
  return typeof ref.invoke === 'function' || ref.isInvokable === true;
}

// Create an invokable reference (wraps a function)
export function createInvokableRef(fn: Function, debugLabel?: string) {
  const ref = formula(() => fn, debugLabel || 'invokableRef');
  (ref as any).isInvokable = true;
  (ref as any).invoke = (...args: any[]) => fn(...args);
  return ref;
}

// Create a read-only wrapper around a reference
export function createReadOnlyRef(ref: any, debugLabel?: string) {
  return formula(() => valueForRef(ref), debugLabel || 'readOnlyRef');
}

// Create a debug alias reference (for development tools)
export function createDebugAliasRef(inner: any, debugLabel: string) {
  const ref = formula(() => valueForRef(inner), debugLabel);
  (ref as any).debugLabel = debugLabel;
  (ref as any).inner = inner;
  return ref;
}

// ---------------------------------------------------------------------------
// IterableReference support (additive port of @glimmer/reference iterable.ts)
// ---------------------------------------------------------------------------
// Kept isolated from createConstRef/createComputeRef two-way binding paths.
// Uses its own cell-backed tag for dirtying in createIteratorItemRef.

type KeyFor = (item: unknown, memo: unknown) => unknown;

const NULL_IDENTITY = {};

const KEY_AT_INDEX: KeyFor = (_, index) => index;
const INDEX_KEY: KeyFor = (_, index) => String(index);
const IDENTITY_KEY: KeyFor = (item) => {
  if (item === null) return NULL_IDENTITY;
  return item;
};

function isIndexable(v: unknown): v is object {
  return v !== null && (typeof v === 'object' || typeof v === 'function');
}

class WeakMapWithPrimitives<T> {
  private _weakMap?: WeakMap<object, T>;
  private _primitiveMap?: Map<unknown, T>;
  private get weakMap() {
    if (!this._weakMap) this._weakMap = new WeakMap();
    return this._weakMap;
  }
  private get primitiveMap() {
    if (!this._primitiveMap) this._primitiveMap = new Map();
    return this._primitiveMap;
  }
  set(key: unknown, value: T) {
    if (isIndexable(key)) this.weakMap.set(key, value);
    else this.primitiveMap.set(key, value);
  }
  get(key: unknown): T | undefined {
    if (isIndexable(key)) return this.weakMap.get(key);
    return this.primitiveMap.get(key);
  }
}

const IDENTITIES = new WeakMapWithPrimitives<object[]>();

function identityForNthOccurence(value: unknown, count: number) {
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

export function uniqueKeyFor(keyFor: KeyFor): KeyFor {
  const seen = new WeakMapWithPrimitives<number>();
  return (value: unknown, memo: unknown) => {
    const key = keyFor(value, memo);
    const count = seen.get(key) || 0;
    seen.set(key, count + 1);
    if (count === 0) return key;
    return identityForNthOccurence(key, count);
  };
}

function getPath(obj: object, path: string): unknown {
  const parts = path.split('.');
  let current: any = obj;
  for (const part of parts) {
    if (current == null) return undefined;
    current = current[part];
  }
  return current;
}

function makeKeyFor(key: string): KeyFor {
  switch (key) {
    case '@key':
      return uniqueKeyFor(KEY_AT_INDEX);
    case '@index':
      return uniqueKeyFor(INDEX_KEY);
    case '@identity':
      return uniqueKeyFor(IDENTITY_KEY);
    default:
      if (key[0] === '@') {
        throw new Error(
          `invalid keypath: '${key}', valid keys: @index, @identity, or a path`
        );
      }
      return uniqueKeyFor((item) => getPath(item as object, key));
  }
}

export interface IterationItem {
  key: unknown;
  value: unknown;
  memo: unknown;
}

export interface OpaqueIterator {
  isEmpty(): boolean;
  next(): IterationItem | null;
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
      this.current = { kind: 'first', value: iterator[0] };
    }
  }

  isEmpty(): boolean {
    return this.current.kind === 'empty';
  }

  next(): IterationItem | null {
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
    const memo = this.pos;
    const key = this.keyFor(value, memo);
    return { key, value, memo };
  }
}

interface IteratorDelegate {
  isEmpty(): boolean;
  next(): { value: unknown; memo: unknown } | null;
}

class IteratorWrapper implements OpaqueIterator {
  constructor(
    private inner: IteratorDelegate,
    private keyFor: KeyFor
  ) {}
  isEmpty() {
    return this.inner.isEmpty();
  }
  next(): IterationItem | null {
    const nextValue = this.inner.next() as IterationItem | null;
    if (nextValue !== null) {
      nextValue.key = this.keyFor(nextValue.value, nextValue.memo);
    }
    return nextValue;
  }
}

const EMPTY: readonly unknown[] = Object.freeze([]);

function nativeToIterator(iterable: unknown): IteratorDelegate | null {
  if (iterable == null) return null;
  if (typeof (iterable as any)[Symbol.iterator] !== 'function') return null;
  const it = (iterable as any)[Symbol.iterator]();
  let index = -1;
  let done = false;
  let peeked: { value: unknown; memo: unknown } | null = null;
  const advance = () => {
    const step = it.next();
    if (step.done) {
      done = true;
      peeked = null;
    } else {
      index += 1;
      peeked = { value: step.value, memo: index };
    }
  };
  advance();
  return {
    isEmpty() {
      return done && peeked === null && index === -1;
    },
    next() {
      if (peeked === null) return null;
      const result = peeked;
      advance();
      return result;
    },
  };
}

// Create a reference for iterating over a collection.
// Signature: createIteratorRef(listRef, key) → ComputeRef<OpaqueIterator>
export function createIteratorRef(listRef: any, key: string = '@identity') {
  return formula(() => {
    const iterable = valueForRef(listRef);
    const keyFor = makeKeyFor(key);
    if (Array.isArray(iterable)) {
      return new ArrayIterator(iterable, keyFor);
    }
    if (iterable == null || iterable === false) {
      return new ArrayIterator(EMPTY, () => null);
    }
    const delegate = nativeToIterator(iterable);
    if (delegate === null) {
      return new ArrayIterator(EMPTY, () => null);
    }
    return new IteratorWrapper(delegate, keyFor);
  }, 'iteratorRef');
}

// Create a reference for an item in an iteration. Mirrors @glimmer/reference:
// returns a compute ref whose value can be updated, backed by a cell so that
// consumers observing it re-run on change.
export function createIteratorItemRef(_value: unknown) {
  const backing = cell(_value, 'iteratorItemRef');
  const ref = formula(() => backing.value, 'iteratorItemRef');
  (ref as any).update = (newValue: unknown) => {
    if (backing.value !== newValue) {
      backing.value = newValue;
    }
  };
  return ref;
}

// Exported class alias for the iterable reference concept. The test module
// `@glimmer/reference: IterableReference` exercises createIteratorRef directly;
// we expose a small wrapper so callers looking for the class find it.
export class IterableReference {
  static create(listRef: any, key: string = '@identity') {
    return createIteratorRef(listRef, key);
  }
}
