import { DEBUG } from '@glimmer/env';
import type { Destroyable, Destructor } from '@glimmer/interfaces';
import debugToString from '@glimmer/debug-util/lib/debug-to-string';
import { scheduleDestroy, scheduleDestroyed } from '@glimmer/global-context';
import {
  DESTROYABLE_META_KEY,
  type HasDestroyableMetaSlot,
} from '@glimmer/util/lib/destroyable-key';

export { DESTROYABLE_META_KEY } from '@glimmer/util/lib/destroyable-key';

const LIVE_STATE = 0;
const DESTROYING_STATE = 1;
const DESTROYED_STATE = 2;
type DestroyableState = 0 | 1 | 2;

type OneOrMany<T> = null | T | BrandedArray<T>;

interface DestroyableMeta<T extends Destroyable> {
  source?: T;
  parents: OneOrMany<Destroyable>;
  children: OneOrMany<Destroyable>;
  eagerDestructors: OneOrMany<Destructor<T>>;
  destructors: OneOrMany<Destructor<T>>;
  state: DestroyableState;
}

interface UndestroyedDestroyablesError extends Error {
  destroyables: object[];
}

let DESTROYABLE_META:
  | Map<Destroyable, DestroyableMeta<Destroyable>>
  | WeakMap<Destroyable, DestroyableMeta<Destroyable>> = new WeakMap();

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

function createMeta<T extends Destroyable>(destroyable: T): DestroyableMeta<T> {
  let meta: DestroyableMeta<Destroyable> = {
    parents: null,
    children: null,
    eagerDestructors: null,
    destructors: null,
    state: LIVE_STATE,
  };

  if (DEBUG) {
    meta.source = destroyable;
  }

  return meta as unknown as DestroyableMeta<T>;
}

function getDestroyableMeta<T extends Destroyable>(destroyable: T): DestroyableMeta<T> {
  let slotted = destroyable as HasDestroyableMetaSlot;
  let own = slotted[DESTROYABLE_META_KEY];

  if (own !== undefined) return own as DestroyableMeta<T>;

  // `in` rather than a write, so this stays a read for everything else.
  if (DESTROYABLE_META_KEY in slotted) {
    let meta = createMeta(destroyable);

    slotted[DESTROYABLE_META_KEY] = meta;

    if (DEBUG && DESTROYABLE_META instanceof Map) {
      DESTROYABLE_META.set(destroyable, meta as unknown as DestroyableMeta<Destroyable>);
    }

    return meta;
  }

  let meta = DESTROYABLE_META.get(destroyable);

  if (meta === undefined) {
    meta = createMeta(destroyable) as unknown as DestroyableMeta<Destroyable>;
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

export function destroy(destroyable: Destroyable) {
  let meta = getDestroyableMeta(destroyable);

  if (meta.state >= DESTROYING_STATE) return;

  let { parents, children, eagerDestructors, destructors } = meta;

  meta.state = DESTROYING_STATE;

  iterate(children, destroy, undefined);
  iterate(eagerDestructors, runDestructor, destroyable);
  iterate(destructors, deferDestructor, destroyable);

  scheduleDestroyed(() => {
    iterate(parents, removeChildFromParent, destroyable);
    meta.state = DESTROYED_STATE;
  });
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

/** Meta if there is any, without creating it. Mirrors `getDestroyableMeta`. */
function peekDestroyableMeta(destroyable: Destroyable): DestroyableMeta<Destroyable> | undefined {
  let slotted = destroyable as HasDestroyableMetaSlot;
  let own = slotted[DESTROYABLE_META_KEY];

  if (own !== undefined) return own as DestroyableMeta<Destroyable>;

  // An empty slot is proof there is no meta, so the map can be skipped.
  if (DESTROYABLE_META_KEY in slotted) return undefined;

  return DESTROYABLE_META.get(destroyable);
}

export function _hasDestroyableChildren(destroyable: Destroyable) {
  let meta = peekDestroyableMeta(destroyable);

  return meta === undefined ? false : meta.children !== null;
}

export function isDestroying(destroyable: Destroyable) {
  let meta = peekDestroyableMeta(destroyable);

  return meta === undefined ? false : meta.state >= DESTROYING_STATE;
}

export function isDestroyed(destroyable: Destroyable) {
  let meta = peekDestroyableMeta(destroyable);

  return meta === undefined ? false : meta.state >= DESTROYED_STATE;
}

////////////

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

    let map = DESTROYABLE_META as Map<Destroyable, DestroyableMeta<Destroyable>>;
    DESTROYABLE_META = new WeakMap();

    let undestroyed: object[] = [];

    map.forEach((meta) => {
      if (meta.state !== DESTROYED_STATE) {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- @fixme
        undestroyed.push(meta.source!);
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
