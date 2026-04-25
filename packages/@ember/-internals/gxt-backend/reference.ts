import { cell, formula } from '@lifeart/gxt';
import { reference } from '@lifeart/gxt/glimmer-compatibility';
import { getProp, setProp } from '@glimmer/global-context';
import { track, validateTag, valueForTag, consumeTag, createCache } from './validator';

// The canonical REFERENCE symbol used by Glimmer VM's CheckReference.
// Under GXT mode, `@glimmer/reference` is aliased to THIS module (see
// vite.config.mjs), so consumers (e.g. `-debug-strip.ts`'s CheckReference)
// import this exact Symbol. Objects tagged with this key pass the VM's
// `REFERENCE in value` check.
const GLIMMER_REFERENCE: unique symbol = Symbol('REFERENCE') as any;

const _createConstRef = reference.createConstRef;
const _createComputeRef = reference.createComputeRef;
const _createUnboundRef = reference.createUnboundRef;
const _createPrimitiveRef = reference.createPrimitiveRef;
const _childRefFor = reference.childRefFor;
const _valueForRef = reference.valueForRef;

// Markers used by the @glimmer/reference:References test suite to decide
// const/unbound/readonly/invokable status without touching the existing
// cell/formula return shapes that <Input>/<Textarea>/{{mut}} depend on.
const CONST_MARKER = Symbol('gxt:const');
const UNBOUND_MARKER = Symbol('gxt:unbound');
const READONLY_MARKER = Symbol('gxt:readonly');
const COMPUTED_MARKER = Symbol('gxt:computed');
const INVOKABLE_MARKER = Symbol('gxt:invokable');

// Helper: brand an object with the canonical REFERENCE symbol so Glimmer
// VM's CheckReference.validate() (`REFERENCE in value`) accepts it. The
// REFERENCE value is a "reference type" tag (0=CONSTANT, 1=COMPUTE,
// 2=UNBOUND, 3=INVOKABLE) — matching @glimmer/reference's encoding.
function brandRef<T>(ref: T, type: number = 1): T {
  if (ref != null && (typeof ref === 'object' || typeof ref === 'function')) {
    try {
      if (!(GLIMMER_REFERENCE in (ref as any))) {
        (ref as any)[GLIMMER_REFERENCE] = type;
      }
    } catch {
      // frozen — ignore
    }
  }
  return ref;
}

export function createPrimitiveRef(value: any): any {
  const ref = _createPrimitiveRef(value);
  return brandRef(ref, 2 /* UNBOUND */);
}

export function createConstRef(value: any, debugLabel?: any): any {
  const ref = _createConstRef(value, debugLabel);
  try {
    (ref as any)[CONST_MARKER] = true;
    // GXT's createConstRef constructs a `new Dt(value)` that doesn't keep the
    // second (debugLabel) argument. Stock Glimmer's classic Reference carries
    // `debugLabel` so downstream consumers (e.g. fn helper's assertion message,
    // childRefFor's label composition) can produce messages like
    // "this.myFunc". Stamp it on so the label propagates.
    if (debugLabel !== undefined) {
      (ref as any).debugLabel = String(debugLabel);
    }
  } catch {
    // ignore (frozen)
  }
  return brandRef(ref, 0 /* CONSTANT */);
}

export function createUnboundRef(value: any, debugLabel?: any): any {
  const ref = _createUnboundRef(value, debugLabel);
  try {
    (ref as any)[UNBOUND_MARKER] = true;
    (ref as any).__unboundValue = value;
    if (debugLabel !== undefined) {
      (ref as any).debugLabel = String(debugLabel);
    }
  } catch {
    // ignore
  }
  return brandRef(ref, 2 /* UNBOUND */);
}

// createComputeRef: preserve existing cell/formula-backed behavior for
// production code paths (Input/mut/helpers) while adding classic-style
// memoization + update contract for callers that pass a compute fn (+
// optional update fn). The returned object still exposes a `.value` getter
// and `.update` method so gxt-internal childRefFor/bindings see the same
// shape.
export function createComputeRef(
  compute: () => any,
  update?: ((value: any) => void) | null,
  debugLabel?: any
): any {
  // If caller passes no update fn, use a memoized classic-style ref
  // backed by track()/validateTag so that the @glimmer/reference test
  // suite observes correct caching semantics. When an update fn is
  // provided, fall through to the cell/formula-backed path so that
  // two-way binding (Input/mut) keeps working unchanged.
  if (typeof update !== 'function') {
    // Use classic-compliant createCache() which captures consumeTag()
    // deps (including @tracked property reads via tagFor) and only
    // recomputes when any consumed tag's revision advances.
    const cache = createCache(compute);
    const ref: any = {
      [COMPUTED_MARKER]: true,
      [GLIMMER_REFERENCE]: 1 /* COMPUTE */,
      debugLabel,
      get value() {
        return cache.value;
      },
      compute,
    };
    return ref;
  }
  const ref = _createComputeRef(compute);
  try {
    (ref as any)[COMPUTED_MARKER] = true;
    (ref as any).update = update;
    (ref as any).compute = compute;
    (ref as any).debugLabel = debugLabel;
  } catch {
    // ignore
  }
  return brandRef(ref, 1 /* COMPUTE */);
}

export function valueForRef(ref: any): any {
  if (ref && ref[COMPUTED_MARKER] === true && !('cell' in ref)) {
    return ref.value;
  }
  return _valueForRef(ref);
}

export function childRefFor(parentRef: any, path: string): any {
  if (parentRef == null) return _childRefFor(parentRef, path);
  // Honor the stock `@glimmer/reference` lazy-child contract for the hash
  // helper: `@glimmer/runtime/lib/helpers/hash.ts` seeds `parentRef.children`
  // with a Map of per-key original refs so childRefFor returns the per-key
  // original ref (lazy) instead of building an eager child compute. Without
  // this, the hash test "individual hash values are accessed lazily" fails
  // because our generic childCompute calls `getProp(parentRef.value, path)`
  // which forces evaluation of every keyed getter.
  //
  // Gate: require the parent ref's debugLabel to be 'hash' so we don't
  // accidentally honor a stale `.children` Map set elsewhere. This is the
  // exact label stock `hash` uses (see hash.ts line 50).
  if (parentRef.debugLabel === 'hash') {
    const stockChildren = parentRef.children;
    if (stockChildren instanceof Map) {
      const cached = stockChildren.get(path);
      if (cached) return cached;
    }
  }
  // Unbound refs: snapshot the child value and return a new unbound ref.
  if (parentRef[UNBOUND_MARKER] === true) {
    const parent = valueForRef(parentRef);
    if (parent != null && (typeof parent === 'object' || typeof parent === 'function')) {
      return createUnboundRef((parent as any)[path], path);
    }
    // Allow direct property access on primitives (string/number/boolean/symbol/bigint)
    // so that yielded literals like `{{yield "foo"}}` -> `{{yielded.length}}` work.
    // Stock @glimmer/reference uses isDict() (non-null/undefined) here; getProp from
    // @glimmer/global-context rejects primitives, so use direct auto-boxed access.
    if (parent != null) {
      let primValue: any = undefined;
      try {
        primValue = (parent as any)[path];
      } catch {
        // ignore
      }
      return createUnboundRef(primValue, path);
    }
    return createUnboundRef(undefined, path);
  }
  // For computed/const/readonly/invokable refs produced by our wrappers,
  // route child access through the global-context getProp/setProp hooks so
  // classic @glimmer/reference semantics are preserved.
  if (
    parentRef[CONST_MARKER] === true ||
    parentRef[COMPUTED_MARKER] === true ||
    parentRef[READONLY_MARKER] === true ||
    parentRef[INVOKABLE_MARKER] === true
  ) {
    // Cache children so repeated childRefFor returns the same ref
    let children = parentRef.__gxtChildren as Map<string, any> | undefined;
    if (!children) {
      children = new Map();
      try {
        parentRef.__gxtChildren = children;
      } catch {
        // ignore
      }
    }
    const cached = children.get(path);
    if (cached) return cached;
    // Build a classic-cache-backed child ref. createCache() captures
    // consumeTag() deps (including @tracked property reads) and only
    // recomputes when any consumed tag's revision advances — producing
    // the exact "N gets for N mutations" semantics asserted by the
    // @glimmer/reference:References tests.
    const childCompute = () => {
      const p = valueForRef(parentRef);
      if (p != null && (typeof p === 'object' || typeof p === 'function')) {
        return getProp(p as object, path);
      }
      // Allow direct property access on primitives — auto-boxing makes
      // `'foo'.length`, `(42).toString` etc. work. Matches isDict() semantics
      // used by stock @glimmer/reference's childRefFor.
      if (p != null) {
        try {
          return (p as any)[path];
        } catch {
          return undefined;
        }
      }
      return undefined;
    };
    const childCache = createCache(childCompute);
    const label = `${String((parentRef as any).debugLabel ?? 'const')}.${path}`;
    const child: any = {
      [COMPUTED_MARKER]: true,
      [GLIMMER_REFERENCE]: 1 /* COMPUTE */,
      debugLabel: label,
      get value() {
        return childCache.value;
      },
      compute: childCompute,
      update(val: any) {
        const p = valueForRef(parentRef);
        if (p != null && (typeof p === 'object' || typeof p === 'function')) {
          setProp(p as object, path, val);
        }
      },
    };
    children.set(path, child);
    return child;
  }
  // Unmarked parent: GXT's `_childRefFor(parentRef, path)` internally
  // evaluates `parentRef.value` eagerly and passes the result to `I(value, path)`
  // which reads `value.constructor.name`. If the current value is null/undefined
  // (common for stock Glimmer JIT VM iteration refs where the item resolves
  // to a nested hash that hasn't been materialized yet, or bare ${{get}} calls
  // through intermediate undefined), the eager access crashes.
  //
  // Build a classic-style compute ref instead so evaluation is deferred and
  // null/undefined intermediate values simply produce an `undefined` child.
  // This matches stock `@glimmer/reference` childRefFor semantics (see
  // `packages/@glimmer/reference/lib/references.ts::childRefFor`).
  const childCompute = () => {
    const p = valueForRef(parentRef);
    if (p != null && (typeof p === 'object' || typeof p === 'function')) {
      return getProp(p as object, path);
    }
    // Allow direct property access on primitives (string/number/boolean) via
    // JavaScript auto-boxing, matching stock @glimmer/reference's isDict()
    // gate which accepts any non-null/undefined value.
    if (p != null) {
      try {
        return (p as any)[path];
      } catch {
        return undefined;
      }
    }
    return undefined;
  };
  const childCache = createCache(childCompute);
  const label = `${String((parentRef as any)?.debugLabel ?? 'ref')}.${path}`;
  const child: any = {
    [COMPUTED_MARKER]: true,
    [GLIMMER_REFERENCE]: 1 /* COMPUTE */,
    debugLabel: label,
    get value() {
      return childCache.value;
    },
    compute: childCompute,
    update(val: any) {
      const p = valueForRef(parentRef);
      if (p != null && (typeof p === 'object' || typeof p === 'function')) {
        setProp(p as object, path, val);
      }
    },
  };
  return child;
}

// Export the canonical REFERENCE symbol. Because `@glimmer/reference` is
// aliased to this module in GXT mode, this IS the Symbol that Glimmer VM's
// CheckReference.validate() uses for its `REFERENCE in value` check. Every
// reference-returning function in this module brands its output with this
// symbol so arguments flow through the VM's runtime checker.
export const REFERENCE = GLIMMER_REFERENCE;

// Constant reference values — branded with REFERENCE so they pass
// CheckReference when routed through the VM.
export const FALSE_REFERENCE = brandRef(cell(false, 'FALSE_REFERENCE'), 2 /* UNBOUND */);
export const UNDEFINED_REFERENCE = brandRef(
  cell(undefined, 'UNDEFINED_REFERENCE'),
  2 /* UNBOUND */
);
export const NULL_REFERENCE = brandRef(cell(null, 'NULL_REFERENCE'), 2 /* UNBOUND */);
export const TRUE_REFERENCE = brandRef(cell(true, 'TRUE_REFERENCE'), 2 /* UNBOUND */);

// Check if a reference is constant (never changes)
export function isConstRef(ref: any): boolean {
  if (!ref) return false;
  if (ref[CONST_MARKER] === true) return true;
  if (ref[UNBOUND_MARKER] === true) return true;
  // A const ref has no setter and is not computed
  if (
    ref === FALSE_REFERENCE ||
    ref === TRUE_REFERENCE ||
    ref === NULL_REFERENCE ||
    ref === UNDEFINED_REFERENCE
  ) {
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
  // Const and unbound refs are never updatable (additive marker check).
  if (ref[CONST_MARKER] === true) return false;
  if (ref[UNBOUND_MARKER] === true) return false;
  if (ref[READONLY_MARKER] === true) return false;
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
    return;
  }
  // Avoid writing to cell getters that lack an update method.
  try {
    if ('value' in ref) {
      ref.value = value;
    }
  } catch {
    /* ignore: cannot set read-only getter */
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
  return (
    ref[INVOKABLE_MARKER] === true || typeof ref.invoke === 'function' || ref.isInvokable === true
  );
}

// Create an invokable reference that transparently delegates valueForRef,
// updateRef, and childRefFor to the inner reference (matching
// @glimmer/reference:createInvokableRef semantics).
export function createInvokableRef(inner: any, _debugLabel?: string) {
  const ref = createComputeRef(
    () => valueForRef(inner),
    (value: any) => updateRef(inner, value),
    (inner && inner.debugLabel) || 'invokableRef'
  );
  (ref as any)[INVOKABLE_MARKER] = true;
  (ref as any).isInvokable = true;
  (ref as any).__invokableInner = inner;
  (ref as any).invoke = (...args: any[]) => {
    const fn = valueForRef(inner) as unknown;
    if (typeof fn === 'function') return (fn as Function)(...args);
    return undefined;
  };
  return brandRef(ref, 3 /* INVOKABLE */);
}

// Create a read-only wrapper around a reference. Matches the classic
// semantics where a non-updatable inner ref is returned as-is.
export function createReadOnlyRef(ref: any, _debugLabel?: string) {
  if (!isUpdatableRef(ref)) return brandRef(ref, 0 /* CONSTANT */);
  const readOnly = createComputeRef(
    () => valueForRef(ref),
    null,
    (ref && ref.debugLabel) || 'readOnlyRef'
  );
  (readOnly as any)[READONLY_MARKER] = true;
  return brandRef(readOnly, 1 /* COMPUTE */);
}

// Create a debug alias reference (for development tools). The @glimmer
// signature is (debugLabel, inner); support both orders for safety.
export function createDebugAliasRef(debugLabelOrInner: any, innerOrLabel: any) {
  let debugLabel: string;
  let inner: any;
  if (typeof debugLabelOrInner === 'string') {
    debugLabel = debugLabelOrInner;
    inner = innerOrLabel;
  } else {
    inner = debugLabelOrInner;
    debugLabel = innerOrLabel;
  }
  const update = isUpdatableRef(inner) ? (value: any) => updateRef(inner, value) : null;
  const ref = createComputeRef(() => valueForRef(inner), update, debugLabel);
  (ref as any).debugLabel = debugLabel;
  (ref as any).inner = inner;
  if (inner && inner[INVOKABLE_MARKER] === true) {
    (ref as any)[INVOKABLE_MARKER] = true;
    (ref as any).isInvokable = true;
    return brandRef(ref, 3 /* INVOKABLE */);
  }
  return brandRef(ref, 1 /* COMPUTE */);
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
        throw new Error(`invalid keypath: '${key}', valid keys: @index, @identity, or a path`);
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
  private current: { kind: 'empty' } | { kind: 'first'; value: unknown } | { kind: 'progress' };
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
  const ref = formula(() => {
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
  return brandRef(ref, 1 /* COMPUTE */);
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
  return brandRef(ref, 1 /* COMPUTE */);
}

// Exported class alias for the iterable reference concept. The test module
// `@glimmer/reference: IterableReference` exercises createIteratorRef directly;
// we expose a small wrapper so callers looking for the class find it.
export class IterableReference {
  static create(listRef: any, key: string = '@identity') {
    return createIteratorRef(listRef, key);
  }
}
