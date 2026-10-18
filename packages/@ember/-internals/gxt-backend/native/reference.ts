// gxt NATIVE layer — alias target for `@glimmer/reference` (+ `lib/reference`).
//
// Consumers in the native closure are reused classic modules only:
// InternalComponent / LinkTo (`createConstRef`, `isConstRef`, `valueForRef`) and
// the `element` / `unique-id` helpers (`createComputeRef`, `createConstRef`,
// `NULL_REFERENCE`). gxt itself never sees a Reference: the native managers
// adapt gxt args to these shapes at the InternalComponent boundary.
//
// A compute ref is a native/validator `createCache` (so its tag is gxt cells);
// a const / primitive ref carries CONSTANT_TAG. Child refs read and write
// through Ember's `_getProp` / `_setProp` (what classic wires into Glimmer's
// global-context getProp / setProp), so untracked properties entangle the
// property tag exactly as in the VM.
import { DEBUG } from '@glimmer/env';
import { _getProp } from '@ember/-internals/metal/lib/property_get';
import { _setProp } from '@ember/-internals/metal/lib/property_set';
import { type Cache, type Tag, CONSTANT_TAG, createCache, getValue, isConst } from './validator';

export const REFERENCE: unique symbol = Symbol('REFERENCE');

const CONSTANT = 0;
const COMPUTE = 1;
const UNBOUND = 2;
const INVOKABLE = 3;
type ReferenceType = typeof CONSTANT | typeof COMPUTE | typeof UNBOUND | typeof INVOKABLE;

export interface Reference<T = unknown> {
  [REFERENCE]: ReferenceType;
  value: T | undefined;
  compute: (() => T) | null;
  update: ((value: T) => void) | null;
  cache: Cache<T> | null;
  tag: Tag | null;
  children: Map<string, Reference> | null;
  debugLabel?: string | undefined;
}

function makeRef<T>(type: ReferenceType, value?: T, debugLabel?: string | false): Reference<T> {
  const ref: Reference<T> = {
    [REFERENCE]: type,
    value,
    compute: null,
    update: null,
    cache: null,
    tag: type === COMPUTE || type === INVOKABLE ? null : CONSTANT_TAG,
    children: null,
  };
  if (DEBUG && debugLabel) ref.debugLabel = debugLabel;
  return ref;
}

export function createPrimitiveRef<T>(value: T): Reference<T> {
  return makeRef(UNBOUND, value);
}

export function createConstRef<T>(value: T, debugLabel?: string | false): Reference<T> {
  return makeRef(CONSTANT, value, debugLabel);
}

export function createUnboundRef<T>(value: T, debugLabel?: string | false): Reference<T> {
  return makeRef(UNBOUND, value, debugLabel);
}

export function createComputeRef<T>(
  compute: () => T,
  update: ((value: T) => void) | null = null,
  debugLabel?: string | false
): Reference<T> {
  const ref = makeRef<T>(
    COMPUTE,
    undefined,
    debugLabel && `(result of a \`${debugLabel}\` helper)`
  );
  ref.compute = compute;
  ref.update = update;
  return ref;
}

export function createReadOnlyRef<T>(ref: Reference<T>): Reference<T> {
  if (!isUpdatableRef(ref as Reference)) return ref;
  return createComputeRef(() => valueForRef(ref), null, ref.debugLabel);
}

export function isInvokableRef(ref: Reference): boolean {
  return ref[REFERENCE] === INVOKABLE;
}

export function createInvokableRef<T>(inner: Reference<T>): Reference<T> {
  const ref = createComputeRef(
    () => valueForRef(inner),
    (value: T) => updateRef(inner, value)
  );
  ref[REFERENCE] = INVOKABLE;
  return ref;
}

export function isConstRef(ref: Reference): boolean {
  return ref.tag === CONSTANT_TAG;
}

export function isUpdatableRef(ref: Reference): boolean {
  return ref.update !== null;
}

export function valueForRef<T>(ref: Reference<T>): T {
  if (ref.compute === null) return ref.value as T;
  let cache = ref.cache;
  if (cache === null) cache = ref.cache = createCache(ref.compute, DEBUG && ref.debugLabel);
  const value = getValue(cache) as T;
  // A compute ref that consumed no tags is constant forever (Glimmer parity).
  if (isConst(cache)) ref.tag = CONSTANT_TAG;
  return value;
}

export function updateRef<T>(ref: Reference<T>, value: T): void {
  if (DEBUG && ref.update === null) throw new Error('called update on a non-updatable reference');
  (ref.update as (value: T) => void)(value);
}

export function childRefFor(parentRef: Reference, path: string): Reference {
  let children = parentRef.children;
  if (children === null) children = parentRef.children = new Map();
  let child = children.get(path);
  if (child === undefined && parentRef[REFERENCE] === UNBOUND) {
    // Glimmer parity: a child of an unbound (or primitive) ref is itself a
    // snapshot — read once, plain property access, never reactive.
    const parent = parentRef.value;
    child =
      parent === null || parent === undefined
        ? (UNDEFINED_REFERENCE as Reference)
        : createUnboundRef(
            (parent as Record<string, unknown>)[path],
            DEBUG && `${parentRef.debugLabel ?? ''}.${path}`
          );
    children.set(path, child);
  } else if (child === undefined) {
    child = createComputeRef(
      () => {
        const parent = valueForRef(parentRef);
        return parent === null || parent === undefined ? undefined : _getProp(parent, path);
      },
      (value: unknown) => {
        const parent = valueForRef(parentRef);
        if (parent !== null && parent !== undefined) _setProp(parent as object, path, value);
      },
      DEBUG && `${parentRef.debugLabel ?? ''}.${path}`
    );
    children.set(path, child);
  }
  return child;
}

export function childRefFromParts(root: Reference, parts: string[]): Reference {
  let ref = root;
  for (const part of parts) ref = childRefFor(ref, part);
  return ref;
}

export let createDebugAliasRef: undefined | ((debugLabel: string, inner: Reference) => Reference);

if (DEBUG) {
  createDebugAliasRef = (debugLabel: string, inner: Reference) => {
    const ref = createComputeRef(
      () => valueForRef(inner),
      isUpdatableRef(inner) ? (value: unknown) => updateRef(inner, value) : null
    );
    ref[REFERENCE] = inner[REFERENCE];
    ref.debugLabel = debugLabel;
    return ref;
  };
}

export const UNDEFINED_REFERENCE = createPrimitiveRef(undefined);
export const NULL_REFERENCE = createPrimitiveRef(null);
export const TRUE_REFERENCE = createPrimitiveRef(true);
export const FALSE_REFERENCE = createPrimitiveRef(false);
