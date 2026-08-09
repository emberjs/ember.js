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
import type { Revision } from '@glimmer/validator/lib/validators';
import type { Tag } from '@glimmer/interfaces';
import { expect } from '@glimmer/debug-util/lib/platform-utils';
import { getProp, setProp } from '@glimmer/global-context';
import { isDict } from '@glimmer/util/lib/collections';
import { CONSTANT_TAG, INITIAL, validateTag, valueForTag } from '@glimmer/validator/lib/validators';
import { peekTagFor } from '@glimmer/validator/lib/meta';
import { consumeTag, track } from '@glimmer/validator/lib/tracking';

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

  /**
   * Proven plain tracked-field read: the first framed compute consumed
   * exactly the property's canonical cell tag, so the consumed set can
   * never change and recomputes skip frame machinery entirely.
   */
  public knownTag = false;

  /** pending known-tag candidacy; checked once after the first compute */
  public pathParent: Nullable<Reference> = null;
  public pathKey: Nullable<string> = null;

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

    if (ref.knownTag) {
      // the getter's own consumeTag lands in the ambient frame, which
      // is exactly what the framed path's trailing consumeTag achieved
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- knownTag implies compute
      lastValue = ref.lastValue = compute!();
      ref.lastRevision = valueForTag(tag);

      return lastValue;
    }

    const newTag = track(() => {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
      lastValue = ref.lastValue = compute!();
    }, DEBUG && ref.debugLabel);

    tag = ref.tag = newTag;

    ref.lastRevision = valueForTag(newTag);

    if (ref.pathParent !== null) {
      maybeLockKnownTag(ref, newTag);
    }
  } else {
    lastValue = ref.lastValue;
  }

  consumeTag(tag);

  return lastValue as T;
}

/**
 * A child ref locks onto its property's canonical tag when its first
 * framed compute consumed EXACTLY that tag: single tag means no
 * branching getter (those consume different sets per run), and
 * identity with the registry's cell tag means the read was the plain
 * tracked-field getter on a parent that can never change (a mutable
 * parent's tag would have been in the frame too). Checked once.
 */
function maybeLockKnownTag(ref: ReferenceImpl, tag: Tag): void {
  const parentRef = ref.pathParent as ReferenceImpl;
  const key = ref.pathKey as string;

  ref.pathParent = null;
  ref.pathKey = null;

  const parent = parentRef.lastValue;

  if (isDict(parent) && peekTagFor(parent, key) === tag) {
    ref.knownTag = true;
  }
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

    (child as ReferenceImpl).pathParent = parentRef;
    (child as ReferenceImpl).pathKey = path;

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

    ref.debugLabel = debugLabel;

    return ref;
  };
}
