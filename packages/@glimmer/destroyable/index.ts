import { DEBUG } from '@glimmer/env';
import type { Destroyable, Destructor } from '@glimmer/interfaces';
import debugToString from '@glimmer/debug-util/lib/debug-to-string';
import { scheduleDestroy, scheduleDestroyed } from '@glimmer/global-context';

const LIVE_STATE = 0;
const DESTROYING_STATE = 1;
const DESTROYED_STATE = 2;
type DestroyableState = 0 | 1 | 2;

type OneOrMany<T> = null | T | BrandedArray<T>;

interface DestroyableMeta<T extends Destroyable> {
  parents: OneOrMany<Destroyable>;
  children: OneOrMany<Destroyable>;
  eagerDestructors: OneOrMany<Destructor<T>>;
  destructors: OneOrMany<Destructor<T>>;
  state: DestroyableState;
}

interface UndestroyedDestroyablesError extends Error {
  destroyables: object[];
}

// Meta lives on the destroyable rather than in a side table. A `WeakMap.get`
// also forces an identity hash onto the key, and every list item pays for one.
const META = Symbol('DESTROYABLE_META');

type WithMeta = { [META]?: DestroyableMeta<Destroyable> };

const branded = Symbol('BrandedArray');
type BrandedArray<T> = T[] & { [branded]: true };

function isBrandedArray<T>(collection: OneOrMany<T>): collection is BrandedArray<T> {
  return Array.isArray(collection) && branded in collection;
}

function push<T extends object>(collection: OneOrMany<T>, newItem: T): OneOrMany<T> {
  if (collection === null) {
    return newItem;
  } else if (isBrandedArray(collection)) {
    collection.push(newItem);
    return collection;
  } else {
    const b = [collection, newItem] as BrandedArray<T>;
    b[branded] = true;
    return b;
  }
}

// `arg` is threaded through so callers pass a module-level function instead of
// allocating a closure per call.
function iterate<T extends object, A>(
  collection: OneOrMany<T>,
  fn: (item: T, arg: A) => void,
  arg: A
) {
  if (isBrandedArray(collection)) {
    for (let i = 0; i < collection.length; i++) {
      fn(collection[i] as T, arg);
    }
  } else if (collection !== null) {
    fn(collection, arg);
  }
}

function remove<T extends object>(collection: OneOrMany<T>, item: T, message: string | false) {
  if (DEBUG) {
    let collectionIsItem = collection === item;
    let collectionContainsItem = isBrandedArray(collection) && collection.indexOf(item) !== -1;

    if (!collectionIsItem && !collectionContainsItem) {
      throw new Error(String(message));
    }
  }

  if (isBrandedArray(collection) && collection.length > 1) {
    let index = collection.indexOf(item);
    let lastIndex = collection.length - 1;
    if (index !== lastIndex) {
      collection[index] = collection[lastIndex] as T;
    }
    collection.length = lastIndex;
    return collection;
  } else {
    return null;
  }
}

function getDestroyableMeta<T extends Destroyable>(destroyable: T): DestroyableMeta<T> {
  let meta = (destroyable as WithMeta)[META];

  if (meta === undefined) {
    meta = {
      parents: null,
      children: null,
      eagerDestructors: null,
      destructors: null,
      state: LIVE_STATE,
    };

    if (DEBUG) {
      TRACKED_DESTROYABLES?.add(destroyable);
    }

    (destroyable as WithMeta)[META] = meta;
  }

  return meta;
}

export function associateDestroyableChild<T extends Destroyable>(parent: Destroyable, child: T): T {
  if (DEBUG && isDestroying(parent)) {
    throw new Error(
      'Attempted to associate a destroyable child with an object that is already destroying or destroyed'
    );
  }

  let parentMeta = getDestroyableMeta(parent);
  let childMeta = getDestroyableMeta(child);

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

  let meta = getDestroyableMeta(destroyable);

  let destructorsKey: 'eagerDestructors' | 'destructors' = eager
    ? 'eagerDestructors'
    : 'destructors';

  meta[destructorsKey] = push(meta[destructorsKey], destructor);

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

  let meta = getDestroyableMeta(destroyable);

  let destructorsKey: 'eagerDestructors' | 'destructors' = eager
    ? 'eagerDestructors'
    : 'destructors';

  meta[destructorsKey] = remove(
    meta[destructorsKey],
    destructor,
    DEBUG && 'attempted to remove a destructor that was not registered with the destroyable'
  );
}

////////////

function runDestructor<T extends Destroyable>(destructor: Destructor<T>, destroyable: T) {
  destructor(destroyable);
}

function deferDestructor<T extends Destroyable>(destructor: Destructor<T>, destroyable: T) {
  scheduleDestroy(destroyable, destructor);
}

// Every destroy schedules a pass, so a cancelled queue cannot strand anything,
// but the first pass to run drains everyone queued since. Clearing a large list
// produces tens of thousands of these.
let pendingFinalize: Destroyable[] = [];

function finalizeDestroyed() {
  if (pendingFinalize.length === 0) return;

  let batch = pendingFinalize;
  pendingFinalize = [];

  for (const destroyable of batch) {
    let meta = getDestroyableMeta(destroyable);

    iterate(meta.parents, removeChildFromParent, destroyable);
    meta.state = DESTROYED_STATE;
  }
}

export function destroy(destroyable: Destroyable) {
  let meta = getDestroyableMeta(destroyable);

  if (meta.state >= DESTROYING_STATE) return;

  meta.state = DESTROYING_STATE;

  iterate(meta.children, destroy, undefined);
  iterate(meta.eagerDestructors, runDestructor, destroyable);
  iterate(meta.destructors, deferDestructor, destroyable);

  pendingFinalize.push(destroyable);
  scheduleDestroyed(finalizeDestroyed);
}

function removeChildFromParent(parent: Destroyable, child: Destroyable) {
  let parentMeta = getDestroyableMeta(parent);

  if (parentMeta.state !== DESTROYED_STATE) {
    parentMeta.children = remove(
      parentMeta.children,
      child,
      DEBUG &&
        "attempted to remove child from parent, but the parent's children did not contain the child. This is likely a bug with destructors."
    );
  }
}

export function destroyChildren(destroyable: Destroyable) {
  iterate(getDestroyableMeta(destroyable).children, destroy, undefined);
}

export function _hasDestroyableChildren(destroyable: Destroyable) {
  return (destroyable as WithMeta)[META]?.children != null;
}

export function isDestroying(destroyable: Destroyable) {
  let meta = (destroyable as WithMeta)[META];

  return meta === undefined ? false : meta.state >= DESTROYING_STATE;
}

export function isDestroyed(destroyable: Destroyable) {
  let meta = (destroyable as WithMeta)[META];

  return meta === undefined ? false : meta.state >= DESTROYED_STATE;
}

////////////

export let enableDestroyableTracking: undefined | (() => void);
export let assertDestroyablesDestroyed: undefined | (() => void);

// Meta is not enumerable, so tracking needs its own registry.
let TRACKED_DESTROYABLES: Set<Destroyable> | null = null;

if (DEBUG) {
  enableDestroyableTracking = () => {
    if (TRACKED_DESTROYABLES !== null) {
      TRACKED_DESTROYABLES = null;
      throw new Error(
        'Attempted to start destroyable testing, but you did not end the previous destroyable test. Did you forget to call `assertDestroyablesDestroyed()`'
      );
    }

    TRACKED_DESTROYABLES = new Set();
  };

  assertDestroyablesDestroyed = () => {
    if (TRACKED_DESTROYABLES === null) {
      throw new Error(
        'Attempted to assert destroyables destroyed, but you did not start a destroyable test. Did you forget to call `enableDestroyableTracking()`'
      );
    }

    let tracked = TRACKED_DESTROYABLES;
    TRACKED_DESTROYABLES = null;

    let undestroyed: object[] = [];

    tracked.forEach((destroyable) => {
      if (getDestroyableMeta(destroyable).state !== DESTROYED_STATE) {
        undestroyed.push(destroyable);
      }
    });

    if (undestroyed.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
      let objectsToString = undestroyed.map(debugToString!).join('\n    ');
      let error = new Error(
        `Some destroyables were not destroyed during this test:\n    ${objectsToString}`
      ) as UndestroyedDestroyablesError;

      error.destroyables = undestroyed;

      throw error;
    }
  };
}
