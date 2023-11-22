import type { Destroyable, Destructor } from '@glimmer/interfaces';
import { scheduleDestroy, scheduleDestroyed } from '@glimmer/global-context';
import { debugToString } from '@glimmer/util';

const enum DestroyingState {
  Live = 0,
  Destroying = 1,
  Destroyed = 2,
}

type OneOrMany<T> = null | T | T[];

interface DestroyableMeta<T extends Destroyable> {
  source?: T;
  parents: OneOrMany<Destroyable>;
  children: OneOrMany<Destroyable>;
  eagerDestructors: OneOrMany<Destructor<T>>;
  destructors: OneOrMany<Destructor<T>>;
  state: DestroyingState;
}

interface UndestroyedDestroyablesError extends Error {
  destroyables: object[];
}

let DESTROYABLE_META:
  | Map<Destroyable, DestroyableMeta<Destroyable>>
  | WeakMap<Destroyable, DestroyableMeta<Destroyable>> = new WeakMap();

function push<T extends object>(collection: OneOrMany<T>, newItem: T): OneOrMany<T> {
  if (collection === null) {
    return newItem;
  } else if (Array.isArray(collection)) {
    collection.push(newItem);
    return collection;
  } else {
    return [collection, newItem];
  }
}

function iterate<T extends object>(collection: OneOrMany<T>, fn: (item: T) => void) {
  if (Array.isArray(collection)) {
    collection.forEach(fn);
  } else if (collection !== null) {
    fn(collection);
  }
}

function remove<T extends object>(collection: OneOrMany<T>, item: T, message: string | false) {
  if (import.meta.env.DEV) {
    let collectionIsItem = collection === item;
    let collectionContainsItem = Array.isArray(collection) && collection.indexOf(item) !== -1;

    if (!collectionIsItem && !collectionContainsItem) {
      throw new Error(String(message));
    }
  }

  if (Array.isArray(collection) && collection.length > 1) {
    let index = collection.indexOf(item);
    collection.splice(index, 1);
    return collection;
  } else {
    return null;
  }
}

function getDestroyableMeta<T extends Destroyable>(destroyable: T): DestroyableMeta<T> {
  let meta = DESTROYABLE_META.get(destroyable);

  if (meta === undefined) {
    meta = {
      parents: null,
      children: null,
      eagerDestructors: null,
      destructors: null,
      state: DestroyingState.Live,
    };

    if (import.meta.env.DEV) {
      meta.source = destroyable as object;
    }

    DESTROYABLE_META.set(destroyable, meta);
  }

  return meta as unknown as DestroyableMeta<T>;
}

export function associateDestroyableChild<T extends Destroyable>(parent: Destroyable, child: T): T {
  if (import.meta.env.DEV && isDestroying(parent)) {
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
  if (import.meta.env.DEV && isDestroying(destroyable)) {
    throw new Error(
      'Attempted to register a destructor with an object that is already destroying or destroyed'
    );
  }

  let meta = getDestroyableMeta(destroyable);

  let destructorsKey: 'eagerDestructors' | 'destructors' =
    eager === true ? 'eagerDestructors' : 'destructors';

  meta[destructorsKey] = push(meta[destructorsKey], destructor);

  return destructor;
}

export function unregisterDestructor<T extends Destroyable>(
  destroyable: T,
  destructor: Destructor<T>,
  eager = false
): void {
  if (import.meta.env.DEV && isDestroying(destroyable)) {
    throw new Error(
      'Attempted to unregister a destructor with an object that is already destroying or destroyed'
    );
  }

  let meta = getDestroyableMeta(destroyable);

  let destructorsKey: 'eagerDestructors' | 'destructors' =
    eager === true ? 'eagerDestructors' : 'destructors';

  meta[destructorsKey] = remove(
    meta[destructorsKey],
    destructor,
    import.meta.env.DEV &&
      'attempted to remove a destructor that was not registered with the destroyable'
  );
}

////////////

export function destroy(destroyable: Destroyable) {
  let meta = getDestroyableMeta(destroyable);

  if (meta.state >= DestroyingState.Destroying) return;

  let { parents, children, eagerDestructors, destructors } = meta;

  meta.state = DestroyingState.Destroying;

  iterate(children, destroy);
  iterate(eagerDestructors, (destructor) => destructor(destroyable));
  iterate(destructors, (destructor) => scheduleDestroy(destroyable, destructor));

  scheduleDestroyed(() => {
    iterate(parents, (parent) => removeChildFromParent(destroyable, parent));

    meta.state = DestroyingState.Destroyed;
  });
}

function removeChildFromParent(child: Destroyable, parent: Destroyable) {
  let parentMeta = getDestroyableMeta(parent);

  if (parentMeta.state === DestroyingState.Live) {
    parentMeta.children = remove(
      parentMeta.children,
      child,
      import.meta.env.DEV &&
        "attempted to remove child from parent, but the parent's children did not contain the child. This is likely a bug with destructors."
    );
  }
}

export function destroyChildren(destroyable: Destroyable) {
  let { children } = getDestroyableMeta(destroyable);

  iterate(children, destroy);
}

export function _hasDestroyableChildren(destroyable: Destroyable) {
  let meta = DESTROYABLE_META.get(destroyable);

  return meta === undefined ? false : meta.children !== null;
}

export function isDestroying(destroyable: Destroyable) {
  let meta = DESTROYABLE_META.get(destroyable);

  return meta === undefined ? false : meta.state >= DestroyingState.Destroying;
}

export function isDestroyed(destroyable: Destroyable) {
  let meta = DESTROYABLE_META.get(destroyable);

  return meta === undefined ? false : meta.state >= DestroyingState.Destroyed;
}

////////////

export let enableDestroyableTracking: undefined | (() => void);
export let assertDestroyablesDestroyed: undefined | (() => void);

if (import.meta.env.DEV) {
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
      if (meta.state !== DestroyingState.Destroyed) {
        undestroyed.push(meta.source!);
      }
    });

    if (undestroyed.length > 0) {
      let objectsToString = undestroyed.map(debugToString!).join('\n    ');
      let error = new Error(
        `Some destroyables were not destroyed during this test:\n    ${objectsToString}`
      ) as UndestroyedDestroyablesError;

      error.destroyables = undestroyed;

      throw error;
    }
  };
}
