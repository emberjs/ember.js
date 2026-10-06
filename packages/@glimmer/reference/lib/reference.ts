import { DEBUG } from '@glimmer/env';
import type {
  ComputeReference,
  ConstantReference,
  InvokableReference,
  Nullable,
  Reference,
  ReferenceSymbol,
  ReferenceType,
  UnboundReference,
} from '@glimmer/interfaces';
import { isConstComputed, readComputed, TagNode } from '@glimmer/signals/lib/tags';
import { expect } from '@glimmer/debug-util/lib/platform-utils';
import { DESTROYABLE_META_KEY } from '@glimmer/util/lib/destroyable-key';
import { getProp, setProp } from '@glimmer/global-context';
import { isDict } from '@glimmer/util/lib/collections';

export const REFERENCE: ReferenceSymbol = Symbol('REFERENCE') as ReferenceSymbol;

const CONSTANT: ConstantReference = 0;
const COMPUTE: ComputeReference = 1;
const UNBOUND: UnboundReference = 2;
const INVOKABLE: InvokableReference = 3;

export type { Reference as default };
export type { Reference };

//////////

export interface ReferenceEnvironment {
  getProp(obj: unknown, path: string): unknown;
  setProp(obj: unknown, path: string, value: unknown): unknown;
}

/**
 * The value of `kind` for a COMPUTED node, and the flags of a node that has a
 * valid value. See `@glimmer/signals/lib/tags`.
 */
const COMPUTED_NODE = 2;
const NOT_EVALUATED = 0;
const EVALUATED = 1;

/**
 * A reference is a node of the reactive graph.
 *
 * - `fn` computes the value.
 * - `value` holds the last value.
 */
class ReferenceImpl<T = unknown> extends TagNode implements Reference<T> {
  [DESTROYABLE_META_KEY]: object | undefined;
  [REFERENCE]: ReferenceType;

  public children: Nullable<Map<string | Reference, Reference>> = null;

  public update: Nullable<(val: T) => void> = null;

  declare public debugLabel?: string;
  declare public value: T | undefined;

  constructor(type: ReferenceType, flags: number) {
    super(COMPUTED_NODE, flags);
    this[REFERENCE] = type;
  }
}

export function createPrimitiveRef<T extends string | symbol | number | boolean | null | undefined>(
  value: T
): Reference<T> {
  const ref = new ReferenceImpl<T>(UNBOUND, EVALUATED);

  ref.value = value;

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
  const ref = new ReferenceImpl<T>(CONSTANT, EVALUATED);

  ref.value = value;

  if (DEBUG) {
    ref.debugLabel = debugLabel as string;
  }

  return ref;
}

export function createUnboundRef<T>(value: T, debugLabel: false | string): Reference<T> {
  const ref = new ReferenceImpl<T>(UNBOUND, EVALUATED);

  ref.value = value;

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
  const ref = new ReferenceImpl<T>(COMPUTE, NOT_EVALUATED);

  ref.fn = compute;
  ref.update = update;

  if (DEBUG) {
    ref.debugLabel = `(result of a \`${debugLabel}\` helper)`;
  }

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
  return isConstComputed(_ref as ReferenceImpl);
}

export function isUpdatableRef(_ref: Reference) {
  const ref = _ref as ReferenceImpl;

  return ref.update !== null;
}

export function valueForRef<T>(_ref: Reference<T>): T {
  return readComputed<T>(_ref as ReferenceImpl<T>);
}

export function updateRef(_ref: Reference, value: unknown) {
  const ref = _ref as ReferenceImpl;

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

    ref[REFERENCE] = inner[REFERENCE];

    ref.debugLabel = inner.debugLabel === false ? false : debugLabel;

    return ref;
  };
}
