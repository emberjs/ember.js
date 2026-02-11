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
import type { Revision, Tag } from '@glimmer/validator';
import { expect } from '@glimmer/debug-util';
import { getProp, setProp } from '@glimmer/global-context';
import { isDict } from '@glimmer/util';
import {
  CONSTANT_TAG,
  consumeTag,
  INITIAL,
  track,
  validateTag,
  valueForTag,
} from '@glimmer/validator';

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

export function createReadOnlyRef(ref: Reference): Reference {
  if (!isUpdatableRef(ref)) return ref;

  return createComputeRef(() => valueForRef(ref), null, ref.debugLabel);
}

export function isInvokableRef(ref: Reference) {
  return ref[REFERENCE] === INVOKABLE;
}

export function createInvokableRef(inner: Reference): Reference {
  const ref = new ReferenceImpl(INVOKABLE);

  ref.compute = () => valueForRef(inner);
  ref.update = (value) => updateRef(inner, value);
  ref.debugLabel = inner.debugLabel === false ? undefined : inner.debugLabel;

  return ref;
}

export function isConstRef(_ref: Reference) {
  const ref = _ref as ReferenceImpl;

  return ref.tag === CONSTANT_TAG;
}

export function isUpdatableRef(_ref: Reference) {
  const ref = _ref as ReferenceImpl;

  return ref.update !== null;
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
    const { compute } = ref;

    const newTag = track(() => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
      lastValue = ref.lastValue = compute!();
    }, DEBUG && ref.debugLabel);

    tag = ref.tag = newTag;

    ref.lastRevision = valueForTag(newTag);
  } else {
    lastValue = ref.lastValue;
  }

  consumeTag(tag);

  return lastValue as T;
}

export function updateRef(_ref: Reference, value: unknown) {
  const ref = _ref as ReferenceImpl;

  const update = expect(ref.update, 'called update on a non-updatable reference');

  update(value);
}

function bindPrototypeMethod(parent: object, path: string, value: unknown): unknown {
  if (
    typeof value === 'function' &&
    !Object.prototype.hasOwnProperty.call(parent, path) &&
    Object.keys(value).length === 0
  ) {
    return value.bind(parent);
  }

  return value;
}

function readChildValue(
  parent: unknown,
  path: string,
  getter: (obj: object, path: string) => unknown
): unknown {
  if (!isDict(parent)) return undefined;

  const value = getter(parent, path);
  return bindPrototypeMethod(parent, path, value);
}

function createUnboundChildRef(parentRef: ReferenceImpl, path: string): Reference {
  const parent = valueForRef(parentRef);

  if (!isDict(parent)) return UNDEFINED_REFERENCE;

  const value = readChildValue(parent, path, (obj, key) => (obj as Record<string, unknown>)[key]);

  return createUnboundRef(value, DEBUG && `${parentRef.debugLabel}.${path}`);
}

function createComputeChildRef(parentRef: ReferenceImpl, path: string): Reference {
  const child = createComputeRef(
    () => {
      const parent = valueForRef(parentRef);
      return readChildValue(parent, path, getProp);
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

  return child;
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

  child =
    type === UNBOUND
      ? createUnboundChildRef(parentRef, path)
      : createComputeChildRef(parentRef, path);

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

    ref.debugLabel = debugLabel;

    return ref;
  };
}
