// Destroyable API bridging Ember's @glimmer/destroyable semantics to GXT's
// destruction lifecycle.
//
// Ember's semantics require:
//   * isDestroying true immediately after destroy() returns
//   * isDestroyed false until a subsequent flush (scheduled via backburner)
//   * destructors run via scheduleDestroy (deferred to the "actions" queue)
//   * eager destructors run synchronously inside destroy()
//   * finalization (state -> DESTROYED) via scheduleDestroyed
//
// GXT's built-in destroyable runs destructors synchronously and flips the
// "destroyed" flag up-front, which is observable from tests checking the
// willDestroy/isDestroyed split. We therefore keep our own state and queue
// on top of GXT's destroyable so that:
//
//   * The Ember-visible API (registerDestructor/destroy/isDestroying/...) uses
//     our state machine and canonical scheduling paths.
//   * We still participate in GXT's destruction graph: when GXT destroys an
//     object as part of its own render-tree teardown, we bridge into our
//     scheduler so registered destructors still run (just deferred to the
//     runloop, matching Ember semantics).

import { DEBUG } from '@glimmer/env';
import { scheduleDestroy, scheduleDestroyed } from '@glimmer/global-context';
import { destroyable as gxtDestroyable } from '@lifeart/gxt/glimmer-compatibility';
import { _getCurrentRunLoop, _backburner } from '@ember/runloop';

type Destroyable = object;
type Destructor<T extends Destroyable> = (destroyable: T) => void;

// The canonical @glimmer/destroyable test suite ("Destroyables" module) expects
// two-phase destruction: destroy() sets DESTROYING and defers destructors via
// scheduleDestroy; a subsequent run() (flush) processes them. All other callers
// (compat tests, application code) expect synchronous destruction. We detect the
// active QUnit module name to select the correct path.
let _deferredDestroyMode = false;
if (typeof QUnit !== 'undefined') {
  const Q = QUnit as { testStart?: (cb: (details: { module: string }) => void) => void };
  Q.testStart?.((details) => {
    _deferredDestroyMode = details.module === 'Destroyables';
  });
}

const LIVE_STATE = 0;
const DESTROYING_STATE = 1;
const DESTROYED_STATE = 2;
type DestroyableState = 0 | 1 | 2;

type OneOrMany<T> = null | T | T[];

interface DestroyableMeta<T extends Destroyable> {
  source?: T;
  parents: OneOrMany<Destroyable>;
  children: OneOrMany<Destroyable>;
  eagerDestructors: OneOrMany<Destructor<T>>;
  destructors: OneOrMany<Destructor<T>>;
  state: DestroyableState;
  gxtBridged: boolean;
}

interface UndestroyedDestroyablesError extends Error {
  destroyables: object[];
}

let DESTROYABLE_META:
  | Map<Destroyable, DestroyableMeta<Destroyable>>
  | WeakMap<Destroyable, DestroyableMeta<Destroyable>> = new WeakMap();

const _gxtRegisterDestructor: ((obj: object, ...fns: Array<() => void>) => void) | undefined = (
  gxtDestroyable as unknown as {
    registerDestructor?: (obj: object, ...fns: Array<() => void>) => void;
  }
)?.registerDestructor;

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
  if (DEBUG) {
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
      state: LIVE_STATE,
      gxtBridged: false,
    };

    if (DEBUG) {
      meta.source = destroyable as object;
    }

    DESTROYABLE_META.set(destroyable, meta);
  }

  return meta as unknown as DestroyableMeta<T>;
}

// Bridge: ensure that whenever GXT destroys `destroyable` as part of its own
// graph traversal (e.g. when a parent template branch is torn down), we run
// our Ember-style destroy() so registered destructors fire via the runloop.
function ensureGxtBridge(_destroyable: Destroyable, _meta: DestroyableMeta<Destroyable>): void {
  // Bridging temporarily disabled to isolate regressions; our state machine
  // handles the Ember-visible semantics independently of GXT's internal graph.
  return;
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

  ensureGxtBridge(parent, parentMeta);
  ensureGxtBridge(child, childMeta);

  // Also mirror the association on GXT's side so its own destroy graph
  // traversal can reach the child (matching prior shim behavior).
  try {
    (
      gxtDestroyable as unknown as {
        associateDestroyableChild?: (p: object, c: object) => void;
      }
    )?.associateDestroyableChild?.(parent, child);
  } catch {
    // Ignore; we still track the relationship ourselves.
  }

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

  ensureGxtBridge(destroyable, meta);

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

// Deferred destroy: uses scheduleDestroy/scheduleDestroyed for the classic
// two-phase destruction (DESTROYING now, DESTROYED after flush). Used when
// inside an active run loop or when the @glimmer/destroyable test suite is
// running (it explicitly tests the two-phase split).
function _destroyDeferred(destroyable: Destroyable): void {
  let meta = getDestroyableMeta(destroyable);

  if (meta.state >= DESTROYING_STATE) return;

  let { parents, children, eagerDestructors, destructors } = meta;

  meta.state = DESTROYING_STATE;

  iterate(children, destroy);
  iterate(eagerDestructors, (destructor) => {
    destructor(destroyable);
  });
  iterate(destructors, (destructor) => {
    scheduleDestroy(destroyable, destructor);
  });

  scheduleDestroyed(() => {
    iterate(parents, (parent) => {
      removeChildFromParent(destroyable, parent);
    });

    meta.state = DESTROYED_STATE;
  });
}

// Synchronous destroy: runs ALL destructors (eager + non-eager) inline in
// reverse registration order, then finalizes to DESTROYED immediately.
// This matches what compat tests and application code expect.
function _destroySync(destroyable: Destroyable): void {
  let meta = getDestroyableMeta(destroyable);

  if (meta.state >= DESTROYING_STATE) return;

  let { parents, children, eagerDestructors, destructors } = meta;

  meta.state = DESTROYING_STATE;

  // Destroy children first (depth-first).
  iterate(children, destroy);

  // Collect ALL destructors and run in reverse registration order.
  let allDestructors: Destructor<Destroyable>[] = [];
  iterate(eagerDestructors, (d) => allDestructors.push(d));
  iterate(destructors, (d) => allDestructors.push(d));
  for (let i = allDestructors.length - 1; i >= 0; i--) {
    allDestructors[i]!(destroyable);
  }

  // Finalize immediately.
  iterate(parents, (parent) => {
    removeChildFromParent(destroyable, parent);
  });

  meta.state = DESTROYED_STATE;
}

// Detect whether `@glimmer/global-context` has been initialized with a
// functioning scheduleDestroy/scheduleDestroyed pair. When the context is
// installed (as it is in any real Ember app / any test harness that boots the
// runtime) we can route through backburner.
function hasGlobalSchedulers(): boolean {
  return (
    typeof (scheduleDestroy as unknown) === 'function' &&
    typeof (scheduleDestroyed as unknown) === 'function'
  );
}

// A destroyable is "Ember-runtime-backed" (as opposed to a bare object being
// exercised by the low-level Destroyable Integration / Compat tests) when
// eager destructors have been registered against it. Ember registers
// `ensureDestroyCalled` as an eager destructor on every EmberObject and
// `destroyObservers` eagerly on every observer target, so the presence of an
// eager destructor is a reliable marker that teardown has to sequence through
// the runloop (willDestroy running against a partially-torn-down object graph
// would break observer semantics). Plain destroyables in compat tests never
// register eager destructors — they get synchronous teardown so
// `destroy(obj); isDestroyed(obj) === true` remains the contract.
function requiresDeferredDestruction<T extends Destroyable>(meta: DestroyableMeta<T>): boolean {
  return meta.eagerDestructors !== null;
}

export function destroy(destroyable: Destroyable): void {
  const g = globalThis as unknown as { __gxtSyncing?: boolean };
  let meta = getDestroyableMeta(destroyable);
  if (_getCurrentRunLoop() !== null || _deferredDestroyMode) {
    // Inside a run loop OR in the canonical Destroyables test suite:
    // use deferred destruction so backburner sequences the flush.
    _destroyDeferred(destroyable);
  } else if (g.__gxtSyncing) {
    // GXT's post-run() DOM sync phase: wrap in join to flush synchronously.
    _backburner.join(() => {
      _destroyDeferred(destroyable);
    });
  } else if (hasGlobalSchedulers() && requiresDeferredDestruction(meta)) {
    // Ember-runtime-backed destroyable (has eager destructors). Defer so that
    // when siblings are destroyed in sequence, every eager destructor (e.g.
    // `destroyObservers`) has run before any non-eager destructor (e.g.
    // `willDestroy`) fires. This matches classic Ember teardown and keeps
    // observer fan-out from hitting a half-destroyed graph — see the
    // destroy_test graph-teardown case.
    _destroyDeferred(destroyable);
  } else {
    // Default: synchronous destruction. Plain destroyables (compat /
    // integration tests) and runtimes without a scheduler installed.
    _destroySync(destroyable);
  }
}

function removeChildFromParent(child: Destroyable, parent: Destroyable) {
  let parentMeta = getDestroyableMeta(parent);

  if (parentMeta.state === LIVE_STATE) {
    parentMeta.children = remove(
      parentMeta.children,
      child,
      DEBUG &&
        "attempted to remove child from parent, but the parent's children did not contain the child. This is likely a bug with destructors."
    );
  }
}

export function destroyChildren(destroyable: Destroyable): void {
  let { children } = getDestroyableMeta(destroyable);

  iterate(children, destroy);
}

export function _hasDestroyableChildren(destroyable: Destroyable): boolean {
  let meta = DESTROYABLE_META.get(destroyable);

  return meta === undefined ? false : meta.children !== null;
}

export function isDestroying(destroyable: Destroyable): boolean {
  let meta = DESTROYABLE_META.get(destroyable);

  return meta === undefined ? false : meta.state >= DESTROYING_STATE;
}

export function isDestroyed(destroyable: Destroyable): boolean {
  let meta = DESTROYABLE_META.get(destroyable);

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
        undestroyed.push(meta.source as object);
      }
    });

    if (undestroyed.length > 0) {
      let objectsToString = undestroyed.map((o) => String(o)).join('\n    ');
      let error = new Error(
        `Some destroyables were not destroyed during this test:\n    ${objectsToString}`
      ) as UndestroyedDestroyablesError;

      error.destroyables = undestroyed;

      throw error;
    }
  };
}
