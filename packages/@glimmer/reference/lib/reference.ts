import { DEBUG } from '@glimmer/env';
import type {
  CellReference,
  ComputeReference,
  ConstantReference,
  InvokableReference,
  Nullable,
  Reference,
  ReferenceSymbol,
  ReferenceType,
  UnboundReference,
} from '@glimmer/interfaces';
import type { Revision } from '@glimmer/validator/lib/validators';
import type { DirtyableTag, Tag } from '@glimmer/interfaces';
import { expect } from '@glimmer/debug-util/lib/platform-utils';
import { getProp, setProp } from '@glimmer/global-context';
import { isDict } from '@glimmer/util/lib/collections';
import {
  CONSTANT_TAG,
  createTag,
  DIRTY_TAG as dirtyTag,
  INITIAL,
  validateTag,
  valueForTag,
} from '@glimmer/validator/lib/validators';
import { beginTrackFrame, consumeTag, endTrackFrame } from '@glimmer/validator/lib/tracking';

export const REFERENCE: ReferenceSymbol = Symbol('REFERENCE') as ReferenceSymbol;

const CONSTANT: ConstantReference = 0;
const COMPUTE: ComputeReference = 1;
const UNBOUND: UnboundReference = 2;
const INVOKABLE: InvokableReference = 3;
const CELL: CellReference = 4;

export type { Reference as default };
export type { Reference };

//////////

export interface ReferenceEnvironment {
  getProp(obj: unknown, path: string): unknown;
  setProp(obj: unknown, path: string, value: unknown): unknown;
}

class ReferenceImpl<T = unknown> implements Reference<T> {
  [REFERENCE]: ReferenceType;
  public tag: Nullable<Tag> = null;
  public lastRevision: Revision = INITIAL;
  public lastValue?: T;

  public children: Nullable<Map<string | Reference, Reference>> = null;

  public compute: Nullable<() => T> = null;
  public update: Nullable<(val: T) => void> = null;

  public debugLabel?: string;

  constructor(type: ReferenceType) {
    this[REFERENCE] = type;
  }
}

export function createPrimitiveRef<T extends string | symbol | number | boolean | null | undefined>(
  value: T
): Reference<T> {
  const ref = new ReferenceImpl<T>(UNBOUND);

  ref.tag = CONSTANT_TAG;
  ref.lastValue = value;

  if (DEBUG) {
    ref.debugLabel = String(value);
  }

  return ref;
}

export const UNDEFINED_REFERENCE = createPrimitiveRef(undefined);
export const NULL_REFERENCE = createPrimitiveRef(null);
export const TRUE_REFERENCE = createPrimitiveRef(true as const);
export const FALSE_REFERENCE = createPrimitiveRef(false as const);

export function createConstRef<T>(value: T, debugLabel: false | string): Reference<T> {
  const ref = new ReferenceImpl<T>(CONSTANT);

  ref.lastValue = value;
  ref.tag = CONSTANT_TAG;

  if (DEBUG) {
    ref.debugLabel = debugLabel as string;
  }

  return ref;
}

export function createUnboundRef<T>(value: T, debugLabel: false | string): Reference<T> {
  const ref = new ReferenceImpl<T>(UNBOUND);

  ref.lastValue = value;
  ref.tag = CONSTANT_TAG;

  if (DEBUG) {
    ref.debugLabel = debugLabel as string;
  }

  return ref;
}

export function createComputeRef<T = unknown>(
  compute: () => T,
  update: Nullable<(value: T) => void> = null,
  debugLabel: false | string = 'unknown'
): Reference<T> {
  const ref = new ReferenceImpl<T>(COMPUTE);

  ref.compute = compute;
  ref.update = update;

  if (DEBUG) {
    ref.debugLabel = `(result of a \`${debugLabel}\` helper)`;
  }

  return ref;
}

/**
 * A `Cell` reference holds a value directly behind a single dirtyable tag. It is
 * the reference used for `{{#each}}` block params (the item value and its index),
 * which are created and updated by the millions when rendering large lists.
 *
 * Unlike a generic compute reference, a cell has no dependencies to discover: its
 * value lives on the reference itself and its tag never changes. That lets
 * `valueForRef` skip the `track()` frame (a `Tracker` + `Set` allocation per read)
 * and lets `updateRef` mutate the value inline, so a cell needs no `compute`/
 * `update` closures at all — just the reference object and its tag.
 */
export function createIteratorItemRef<T>(value: T): Reference<T> {
  const ref = new ReferenceImpl<T>(CELL);
  const tag = createTag();

  ref.tag = tag;
  ref.lastValue = value;
  ref.lastRevision = valueForTag(tag);

  return ref;
}

export function createReadOnlyRef(ref: Reference): Reference {
  if (!isUpdatableRef(ref)) return ref;

  return createComputeRef(() => valueForRef(ref), null, ref.debugLabel);
}

export function isInvokableRef(ref: Reference) {
  return ref[REFERENCE] === INVOKABLE;
}

export function createInvokableRef(inner: Reference): Reference {
  const ref = createComputeRef(
    () => valueForRef(inner),
    (value) => updateRef(inner, value)
  );
  ref.debugLabel = inner.debugLabel;
  ref[REFERENCE] = INVOKABLE;

  return ref;
}

export function isConstRef(_ref: Reference) {
  const ref = _ref as ReferenceImpl;

  return ref.tag === CONSTANT_TAG;
}

export function isUpdatableRef(_ref: Reference) {
  const ref = _ref as ReferenceImpl;

  return ref[REFERENCE] === CELL || ref.update !== null;
}

export function valueForRef<T>(_ref: Reference<T>): T {
  const ref = _ref as ReferenceImpl<T>;

  let { tag } = ref;

  if (tag === CONSTANT_TAG) {
    return ref.lastValue as T;
  }

  const { lastRevision } = ref;
  let lastValue;

  if (tag === null || !validateTag(tag, lastRevision)) {
    if (ref[REFERENCE] === CELL) {
      // A cell's value is stored on the reference and gated by a fixed tag, so
      // there are no dependencies to (re)discover — read the stored value and
      // re-snapshot the tag without opening a tracking frame.
      lastValue = ref.lastValue;
      ref.lastRevision = valueForTag(tag as Tag);
    } else {
      const { compute } = ref;

      // Inlined `track()`: opening the frame directly avoids allocating a thunk
      // closure on every (re)compute. This is the hottest path in the VM — every
      // reference read that needs evaluation passes through here.
      beginTrackFrame(DEBUG && ref.debugLabel);
      try {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
        lastValue = ref.lastValue = compute!();
      } finally {
        tag = ref.tag = endTrackFrame();
      }

      ref.lastRevision = valueForTag(tag);
    }
  } else {
    lastValue = ref.lastValue;
  }

  consumeTag(tag as Tag);

  return lastValue as T;
}

export function updateRef(_ref: Reference, value: unknown) {
  const ref = _ref as ReferenceImpl;

  if (ref[REFERENCE] === CELL) {
    // Equality-gated inline update — no closure indirection. Mirrors the old
    // `createIteratorItemRef` setter semantics.
    if (ref.lastValue !== value) {
      ref.lastValue = value;
      dirtyTag(ref.tag as DirtyableTag);
    }
    return;
  }

  const update = expect(ref.update, 'called update on a non-updatable reference');

  update(value);
}

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
        DEBUG && `${parentRef.debugLabel}.${path}`
      );
    } else {
      child = UNDEFINED_REFERENCE;
    }
  } else {
    child = createComputeRef(
      () => {
        const parent = valueForRef(parentRef);

        if (isDict(parent)) {
          return getProp(parent, path);
        }
      },
      (val) => {
        const parent = valueForRef(parentRef);

        if (isDict(parent)) {
          return setProp(parent, path, val);
        }
      }
    );

    if (DEBUG) {
      child.debugLabel = `${parentRef.debugLabel}.${path}`;
    }
  }

  children.set(path, child);

  return child;
}

export function childRefFromParts(root: Reference, parts: string[]): Reference {
  let reference = root;

  for (const part of parts) {
    reference = childRefFor(reference, part);
  }

  return reference;
}

export let createDebugAliasRef: undefined | ((debugLabel: string, inner: Reference) => Reference);

if (DEBUG) {
  createDebugAliasRef = (debugLabel: string, inner: Reference) => {
    const update = isUpdatableRef(inner) ? (value: unknown): void => updateRef(inner, value) : null;
    const ref = createComputeRef(() => valueForRef(inner), update);

    // A debug alias is a genuine compute reference (it recomputes through
    // `inner`); never inherit the CELL type, whose fast paths assume the value
    // lives directly on the reference.
    ref[REFERENCE] = inner[REFERENCE] === CELL ? COMPUTE : inner[REFERENCE];

    ref.debugLabel = debugLabel;

    return ref;
  };
}
