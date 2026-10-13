// gxt NATIVE layer — alias target for `@glimmer/destroyable` (re-exported
// unchanged by `@ember/destroyable`).
//
// Ember's two-phase destruction semantics (Glimmer's algorithm, scheduled on
// backburner directly — classic routes the same two queues through
// @glimmer/global-context's scheduleDestroy / scheduleDestroyed, which is not
// part of the native closure):
//   destroy(x): isDestroying(x) = true now; children destroyed first; eager
//   destructors run now; destructors run in the runloop `actions` queue;
//   isDestroyed(x) = true in the `destroy` queue.
//
// ONE destructor graph with gxt: gxt keeps its own per-object destructor
// registry (component nodes, render contexts, formulas). Ember `destroy(x)`
// also runs gxt's destructors registered on `x` (unless gxt already started
// tearing `x` down), so an Ember-destroyed object releases its gxt bindings in
// the same eager phase. The opposite edge — gxt tearing down a component node
// that has Ember destructors / children — is the native component manager's gxt
// destructor calling Ember `destroy(instance)` (Glimmer's `destroyComponent`
// does exactly that). Ember keeps its own metadata (parents / children / two
// queues / unregister / test tracking) because gxt's registry is synchronous,
// append-only and parent-agnostic; destructors are registered in exactly ONE of
// the two registries, never mirrored.
import { DEBUG } from '@glimmer/env';
import { schedule } from '@ember/runloop';
import getDebugName from '@ember/-internals/utils/lib/get-debug-name';
import { destroyable as gxtDestroyable } from '@lifeart/gxt/glimmer-compatibility';

type Destroyable = object;
type Destructor<T extends Destroyable> = (destroyable: T) => void;

const LIVE_STATE = 0;
const DESTROYING_STATE = 1;
const DESTROYED_STATE = 2;
type DestroyableState = 0 | 1 | 2;

const BRANDED: unique symbol = Symbol('BrandedArray');
type BrandedArray<T> = T[] & { [BRANDED]: true };
type OneOrMany<T> = null | T | BrandedArray<T>;

interface DestroyableMeta<T extends Destroyable> {
  source?: T;
  parents: OneOrMany<Destroyable>;
  children: OneOrMany<Destroyable>;
  eagerDestructors: OneOrMany<Destructor<T>>;
  destructors: OneOrMany<Destructor<T>>;
  state: DestroyableState;
}

let DESTROYABLE_META:
  | Map<Destroyable, DestroyableMeta<Destroyable>>
  | WeakMap<Destroyable, DestroyableMeta<Destroyable>> = new WeakMap();

function isBrandedArray<T>(collection: OneOrMany<T>): collection is BrandedArray<T> {
  return Array.isArray(collection) && BRANDED in collection;
}

function push<T extends object>(collection: OneOrMany<T>, newItem: T): OneOrMany<T> {
  if (collection === null) return newItem;
  if (isBrandedArray(collection)) {
    collection.push(newItem);
    return collection;
  }
  const branded = [collection, newItem] as BrandedArray<T>;
  branded[BRANDED] = true;
  return branded;
}

function iterate<T extends object>(collection: OneOrMany<T>, fn: (item: T) => void): void {
  if (isBrandedArray(collection)) collection.forEach(fn);
  else if (collection !== null) fn(collection);
}

function remove<T extends object>(
  collection: OneOrMany<T>,
  item: T,
  message: string | false
): OneOrMany<T> {
  if (DEBUG) {
    const isItem = collection === item;
    const containsItem = isBrandedArray(collection) && collection.indexOf(item) !== -1;
    if (!isItem && !containsItem) throw new Error(String(message));
  }
  if (isBrandedArray(collection) && collection.length > 1) {
    const index = collection.indexOf(item);
    const lastIndex = collection.length - 1;
    if (index !== lastIndex) collection[index] = collection[lastIndex] as T;
    collection.length = lastIndex;
    return collection;
  }
  return null;
}

function getDestroyableMeta<T extends Destroyable>(destroyable: T): DestroyableMeta<T> {
  let meta = DESTROYABLE_META.get(destroyable);
  if (meta === undefined) {
    meta = {
      parents: null,
      children: null,
      eagerDestructors: null,
      destructors: null,
      state: LIVE_STATE,
    };
    if (DEBUG) meta.source = destroyable;
    DESTROYABLE_META.set(destroyable, meta);
  }
  return meta as unknown as DestroyableMeta<T>;
}

export function associateDestroyableChild<T extends Destroyable>(parent: Destroyable, child: T): T {
  if (DEBUG && isDestroying(parent)) {
    throw new Error(
      'Attempted to associate a destroyable child with an object that is already destroying or destroyed'
    );
  }
  const parentMeta = getDestroyableMeta(parent);
  const childMeta = getDestroyableMeta(child);
  parentMeta.children = push(parentMeta.children, child);
  childMeta.parents = push(childMeta.parents, parent);
  return child;
}

export function registerDestructor<T extends Destroyable>(
  destroyable: T,
  destructor: Destructor<T>,
  eager = false
): Destructor<T> {
  if (DEBUG && isDestroying(destroyable)) {
    throw new Error(
      'Attempted to register a destructor with an object that is already destroying or destroyed'
    );
  }
  const meta = getDestroyableMeta(destroyable);
  if (eager) meta.eagerDestructors = push(meta.eagerDestructors, destructor);
  else meta.destructors = push(meta.destructors, destructor);
  return destructor;
}

export function unregisterDestructor<T extends Destroyable>(
  destroyable: T,
  destructor: Destructor<T>,
  eager = false
): void {
  if (DEBUG && isDestroying(destroyable)) {
    throw new Error(
      'Attempted to unregister a destructor with an object that is already destroying or destroyed'
    );
  }
  const meta = getDestroyableMeta(destroyable);
  const message =
    DEBUG && 'attempted to remove a destructor that was not registered with the destroyable';
  if (eager) meta.eagerDestructors = remove(meta.eagerDestructors, destructor, message);
  else meta.destructors = remove(meta.destructors, destructor, message);
}

export function destroy(destroyable: Destroyable): void {
  const meta = getDestroyableMeta(destroyable);
  if (meta.state >= DESTROYING_STATE) return;

  const { parents, children, eagerDestructors, destructors } = meta;
  meta.state = DESTROYING_STATE;

  iterate(children, destroy);
  iterate(eagerDestructors, (destructor) => destructor(destroyable));
  // gxt's own destructors on this object (render contexts / bindings of a gxt
  // node), unless gxt is already tearing it down (it then called us).
  if (!gxtDestroyable.isDestructionStarted(destroyable)) {
    gxtDestroyable.destroySync(destroyable);
  }
  iterate(destructors, (destructor) => {
    schedule('actions', null, destructor, destroyable);
  });

  schedule('destroy', null, () => {
    iterate(parents, (parent) => removeChildFromParent(destroyable, parent));
    meta.state = DESTROYED_STATE;
  });
}

function removeChildFromParent(child: Destroyable, parent: Destroyable): void {
  const parentMeta = getDestroyableMeta(parent);
  if (parentMeta.state !== DESTROYED_STATE) {
    parentMeta.children = remove(
      parentMeta.children,
      child,
      DEBUG &&
        "attempted to remove child from parent, but the parent's children did not contain the child. This is likely a bug with destructors."
    );
  }
}

export function destroyChildren(destroyable: Destroyable): void {
  iterate(getDestroyableMeta(destroyable).children, destroy);
}

export function _hasDestroyableChildren(destroyable: Destroyable): boolean {
  const meta = DESTROYABLE_META.get(destroyable);
  return meta === undefined ? false : meta.children !== null;
}

export function isDestroying(destroyable: Destroyable): boolean {
  const meta = DESTROYABLE_META.get(destroyable);
  return meta === undefined ? false : meta.state >= DESTROYING_STATE;
}

export function isDestroyed(destroyable: Destroyable): boolean {
  const meta = DESTROYABLE_META.get(destroyable);
  return meta === undefined ? false : meta.state >= DESTROYED_STATE;
}

// DEBUG-only leak tracking used by @ember/test-helpers (Glimmer's algorithm).
export let enableDestroyableTracking: undefined | (() => void);
export let assertDestroyablesDestroyed: undefined | (() => void);

if (DEBUG) {
  let isTesting = false;

  enableDestroyableTracking = () => {
    if (isTesting) {
      // Reset destroyable meta just in case, before throwing the error
      DESTROYABLE_META = new WeakMap();
      throw new Error(
        'Attempted to start destroyable testing, but you did not end the previous destroyable test. Did you forget to call `assertDestroyablesDestroyed()`'
      );
    }
    isTesting = true;
    DESTROYABLE_META = new Map();
  };

  assertDestroyablesDestroyed = () => {
    if (!isTesting) {
      throw new Error(
        'Attempted to assert destroyables destroyed, but you did not start a destroyable test. Did you forget to call `enableDestroyableTracking()`'
      );
    }
    isTesting = false;

    const map = DESTROYABLE_META as Map<Destroyable, DestroyableMeta<Destroyable>>;
    DESTROYABLE_META = new WeakMap();

    const undestroyed: object[] = [];
    map.forEach((meta) => {
      if (meta.state !== DESTROYED_STATE) undestroyed.push(meta.source as object);
    });

    if (undestroyed.length > 0) {
      const objectsToString = undestroyed.map((d) => getDebugName!(d)).join('\n    ');
      const error = new Error(
        `Some destroyables were not destroyed during this test:\n    ${objectsToString}`
      ) as Error & { destroyables: object[] };
      error.destroyables = undestroyed;
      throw error;
    }
  };
}
