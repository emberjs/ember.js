import { meta as metaFor } from '@ember/-internals/meta/lib/meta';
import { isEmberArray } from '@ember/array/-internals';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { getGxtRenderer } from '@ember/-internals/gxt-backend/gxt-bridge';
// GXT dual-backend note: in classic mode `@glimmer/validator` resolves to the
// vendored package; in EMBER_RENDER_BACKEND=gxt mode rollup aliases it to
// packages/@ember/-internals/gxt-backend/validator.ts. Both shapes expose the
// same named exports, so a namespace import yields a `validator` object with
// the same surface as @lifeart/gxt/glimmer-compatibility's `validator`.
// BARREL specifiers are load-bearing: the rollup GXT alias map redirects the
// exact '@glimmer/validator' key to the gxt-backend shim; deep lib/* paths
// would resolve to the real VM source in GXT builds (scripts/gxt-alias-map.mjs).
// eslint-disable-next-line ember-local/no-barrel-imports
import * as validator from '@glimmer/validator';
// eslint-disable-next-line ember-local/no-barrel-imports
import {
  consumeTag as compatConsumeTag,
  tagFor as compatTagFor,
  trackedData as compatTrackedData,
} from '@glimmer/validator';

import type { ElementDescriptor } from '..';
import { CHAIN_PASS_THROUGH } from './chain-tags';
import type { ExtendedMethodDecorator, DecoratorPropertyDescriptor } from './decorator';
import { COMPUTED_SETTERS, isElementDescriptor, setClassicDecorator } from './decorator';
// Slice-123 (Cluster B): the intra-metal `notifyPropertyChange` reader (the
// `__GXT_MODE__`-gated `_notifyPropChange(this, key)` call inside the
// @tracked setter, post-`dirtyTagFor`) graduated from the pre-slice-123
// `(globalThis as any).__emberNotifyPropertyChange` raw-globalThis hop to
// a direct sibling import. This file already imports from peers
// `./chain-tags`, `./decorator`, and `./tags`, so adding `./property_events`
// is a straightforward sibling edge with no new module boundary crossed
// (matches the slice-122 intra-package zero-bridge precedent). Only the
// cross-package `gxt-backend/manager.ts` reader still routes through
// `compilePipeline.notifyPropertyChange`. See `notifyPropertyChange` doc
// in gxt-bridge.ts.
import { notifyPropertyChange } from './property_events';

const {
  consumeTag: _nativeConsumeTag,
  tagFor: _nativeTagFor,
  trackedData: _nativeTrackedData,
} = validator;

// Use compat trackedData for backtracking detection support.
// The native GXT trackedData doesn't support backtracking detection.
const trackedData = compatTrackedData;

// Use compat versions that integrate with createCache tracking
const consumeTag = compatConsumeTag;
const tagFor = compatTagFor;

// GXT-only backtracking bookkeeping on the single tracked cell. These live on
// the gxt-backend validator shim (classic `@glimmer/validator` does not export
// them, so they are `undefined` there); only ever invoked under `__GXT_MODE__`.
// Accessed via the namespace import to avoid a classic-build link error on a
// missing named export.
const _gxtRecordTrackedRead = (validator as { recordTrackedCellRead?: unknown })
  .recordTrackedCellRead as ((cell: unknown, key: string | symbol, obj: object) => void) | undefined;
const _gxtAssertTrackedBacktrack = (validator as { assertTrackedCellBacktrack?: unknown })
  .assertTrackedCellBacktrack as
  | ((cell: unknown, key: string | symbol, obj: object) => void)
  | undefined;

/**
  @decorator
  @private

  Marks a property as tracked.

  By default, a component's properties are expected to be static,
  meaning you are not able to update them and have the template update accordingly.
  Marking a property as tracked means that when that property changes,
  a rerender of the component is scheduled so the template is kept up to date.

  There are two usages for the `@tracked` decorator, shown below.

  @example No dependencies

  If you don't pass an argument to `@tracked`, only changes to that property
  will be tracked:

  ```typescript
  import Component from '@glimmer/component';
  import { tracked } from '@glimmer/tracking';

  export default class MyComponent extends Component {
    @tracked
    remainingApples = 10
  }
  ```

  When something changes the component's `remainingApples` property, the rerender
  will be scheduled.

  @example Dependents

  In the case that you have a computed property that depends other
  properties, you want to track both so that when one of the
  dependents change, a rerender is scheduled.

  In the following example we have two properties,
  `eatenApples`, and `remainingApples`.

  ```typescript
  import Component from '@glimmer/component';
  import { tracked } from '@glimmer/tracking';

  const totalApples = 100;

  export default class MyComponent extends Component {
    @tracked
    eatenApples = 0

    get remainingApples() {
      return totalApples - this.eatenApples;
    }

    increment() {
      this.eatenApples = this.eatenApples + 1;
    }
  }
  ```

  @param dependencies Optional dependents to be tracked.
*/
export function tracked(propertyDesc: {
  value: any;
  initializer: () => any;
}): ExtendedMethodDecorator;
export function tracked(target: object, key: string): void;
export function tracked(
  target: object,
  key: string,
  desc: DecoratorPropertyDescriptor
): DecoratorPropertyDescriptor;
export function tracked(...args: any[]): ExtendedMethodDecorator | DecoratorPropertyDescriptor {
  assert(
    `@tracked can only be used directly as a native decorator. If you're using tracked in classic classes, add parenthesis to call it like a function: tracked()`,
    !(isElementDescriptor(args.slice(0, 3)) && args.length === 5 && args[4] === true)
  );

  if (!isElementDescriptor(args)) {
    let propertyDesc = args[0];

    assert(
      `tracked() may only receive an options object containing 'value' or 'initializer', received ${propertyDesc}`,
      args.length === 0 || (typeof propertyDesc === 'object' && propertyDesc !== null)
    );

    if (DEBUG && propertyDesc) {
      let keys = Object.keys(propertyDesc);

      assert(
        `The options object passed to tracked() may only contain a 'value' or 'initializer' property, not both. Received: [${keys}]`,
        keys.length <= 1 &&
          (keys[0] === undefined || keys[0] === 'value' || keys[0] === 'initializer')
      );

      assert(
        `The initializer passed to tracked must be a function. Received ${propertyDesc.initializer}`,
        !('initializer' in propertyDesc) || typeof propertyDesc.initializer === 'function'
      );
    }

    let initializer = propertyDesc ? propertyDesc.initializer : undefined;
    let value = propertyDesc ? propertyDesc.value : undefined;

    let decorator = function (
      target: object,
      key: string,
      _desc?: DecoratorPropertyDescriptor,
      _meta?: any,
      isClassicDecorator?: boolean
    ): DecoratorPropertyDescriptor {
      assert(
        `You attempted to set a default value for ${key} with the @tracked({ value: 'default' }) syntax. You can only use this syntax with classic classes. For native classes, you can use class initializers: @tracked field = 'default';`,
        isClassicDecorator
      );

      let fieldDesc = {
        initializer: initializer || (() => value),
      };

      return descriptorForField([target, key, fieldDesc]);
    };

    setClassicDecorator(decorator);

    return decorator;
  }

  return descriptorForField(args);
}

if (DEBUG) {
  // Normally this isn't a classic decorator, but we want to throw a helpful
  // error in development so we need it to treat it like one
  setClassicDecorator(tracked);
}

// ── GXT @tracked single-cell convergence ───────────────────────────────────
// Phase 1 of the reactivity convergence: a `@tracked` property is backed by
// EXACTLY ONE gxt cell — `cellFor(obj, key)` — which is the same per-property
// cell `tagFor(obj, key)` resolves to (in @lifeart/gxt both share one
// `WeakMap<obj, Map<key, Cell>>` store). The accessor reads/writes that cell;
// Ember's createCache/computed/observer tracking entangles the SAME cell via
// `consumeTag(tagFor(obj, key))`. This retires the former double-backing where
// the value lived in a separate `trackedData` storage cell that was hand-synced
// into the native cell on every get/set.
//
// RE-ENTRANCY GUARD (load-bearing): gxt's `cellFor` creates the cell with
// `new Cell(obj[key])` and `tagFor` creates a lazy formula `() => obj[key]`.
// For a `@tracked` property `obj[key]` IS this very accessor, so the first
// touch re-enters the getter before the cell exists → infinite recursion
// (verified empirically — a naive `cellFor(...).value` read stack-overflows on
// the first read/write). The guard makes that re-entrant `obj[key]` read return
// the memoized initializer value, which seeds the storage cell and resolves the
// lazy formula; after that the cell is self-sufficient. The separate
// `trackedData` storage existed precisely to supply this recursion-safe seed;
// the guard replaces it for the GXT `@tracked` path while classic mode keeps
// the real `@glimmer/validator` `trackedData`.
let _gxtSeedObj: object | null = null;
let _gxtSeedKey: string | symbol | null = null;
let _gxtSeedInit: (() => unknown) | null = null;
let _gxtSeedComputed = false;
let _gxtSeedValue: unknown;

// Pre-install-window write migration. A `@tracked` write that lands BEFORE the
// gxt `cellFor` bridge is installed (the metal module-init window) has no cell
// to write yet, so it is stashed in the classic `trackedData` storage and the
// (obj, key) is flagged here. On the cell's first post-install creation we
// migrate that stashed value into the cell (see `_gxtTrackedCellGet`). This is
// deliberately scoped to ONLY flagged props: normal `@tracked` props never read
// classic storage, so the single-cell convergence (no double-backing) holds.
const _gxtPendingWindowWrites = new WeakMap<object, Set<string | symbol>>();
function _gxtFlagPendingWindowWrite(obj: object, key: string | symbol): void {
  let set = _gxtPendingWindowWrites.get(obj);
  if (set === undefined) {
    set = new Set();
    _gxtPendingWindowWrites.set(obj, set);
  }
  set.add(key);
}
function _gxtTakePendingWindowWrite(obj: object, key: string | symbol): boolean {
  const set = _gxtPendingWindowWrites.get(obj);
  if (set !== undefined && set.has(key)) {
    set.delete(key);
    return true;
  }
  return false;
}

function _gxtTrackedCellGet(
  obj: object,
  key: string | symbol,
  initializer: () => unknown,
  classicGetter: (obj: object) => unknown
): unknown {
  // Re-entrant read from gxt cell creation / lazy-formula resolution — return
  // the memoized seed instead of recursing back through this accessor.
  if (_gxtSeedObj === obj && _gxtSeedKey === key) {
    if (!_gxtSeedComputed) {
      // Seed the cell being created. If a value was written during the
      // pre-install window, migrate it from classic storage; otherwise use the
      // initializer default (NO classic-storage read for normal props — that
      // would re-introduce the double-backing this convergence removed).
      _gxtSeedValue = _gxtTakePendingWindowWrite(obj, key)
        ? classicGetter(obj)
        : (_gxtSeedInit ?? initializer).call(obj);
      _gxtSeedComputed = true;
    }
    return _gxtSeedValue;
  }
  const _cellFor = getGxtRenderer()?.compilePipeline.cellFor;
  if (typeof _cellFor !== 'function') {
    // Bridge not installed yet (metal module-init window, before compile.ts has
    // run its install) — fall back to the classic storage so no read is lost.
    return classicGetter(obj);
  }
  const pObj = _gxtSeedObj;
  const pKey = _gxtSeedKey;
  const pInit = _gxtSeedInit;
  const pComputed = _gxtSeedComputed;
  const pValue = _gxtSeedValue;
  _gxtSeedObj = obj;
  _gxtSeedKey = key;
  _gxtSeedInit = initializer;
  _gxtSeedComputed = false;
  try {
    // skipDefine=true: get-or-create the cell WITHOUT replacing the @tracked
    // get/set descriptor. The guard above is active for both the construction-
    // time `new Cell(obj[key])` read and the `cell.value` resolution read.
    const cell = _cellFor(obj, key, /* skipDefine */ true) as { value: unknown } | undefined;
    // Entangle Ember's createCache/computed on the SAME cell: tagFor(obj,key)
    // returns this very cell (shared per-property store inside @lifeart/gxt).
    const tag = tagFor(obj, key);
    consumeTag(tag);
    // Record the read for DEV backtracking detection on the SAME cell (the
    // setter asserts against it). Replaces the trackedData getter's recording.
    if (DEBUG) _gxtRecordTrackedRead?.(tag, key, obj);
    return cell ? cell.value : undefined;
  } finally {
    _gxtSeedObj = pObj;
    _gxtSeedKey = pKey;
    _gxtSeedInit = pInit;
    _gxtSeedComputed = pComputed;
    _gxtSeedValue = pValue;
  }
}

function _gxtTrackedCellSet(
  obj: object,
  key: string | symbol,
  newValue: unknown,
  initializer: () => unknown
): boolean {
  const _cellFor = getGxtRenderer()?.compilePipeline.cellFor;
  if (typeof _cellFor !== 'function') return false;
  const apply = () => {
    const cell = _cellFor(obj, key, /* skipDefine */ true) as { update: (v: unknown) => void } | undefined;
    // The single-cell scheme relies on the gxt cell exposing a synchronous
    // `update()` (true for gxt 0.0.67, where tagFor's lazy MergedCell extends
    // Cell). Assert it in DEBUG so a future gxt contract change fails loudly
    // here rather than silently no-op'ing a @tracked write.
    assert(
      `@tracked single-cell: gxt cellFor("${String(key)}") returned a cell without update(); the gxt cell contract changed`,
      !cell || typeof cell.update === 'function'
    );
    if (cell) cell.update(newValue);
  };
  if (_gxtSeedObj === obj && _gxtSeedKey === key) {
    apply();
    return true;
  }
  const pObj = _gxtSeedObj;
  const pKey = _gxtSeedKey;
  const pInit = _gxtSeedInit;
  const pComputed = _gxtSeedComputed;
  const pValue = _gxtSeedValue;
  _gxtSeedObj = obj;
  _gxtSeedKey = key;
  _gxtSeedInit = initializer;
  _gxtSeedComputed = false;
  try {
    // Guard active so the construction-time `new Cell(obj[key])` read (when the
    // cell doesn't exist yet) returns the seed instead of recursing.
    apply();
  } finally {
    _gxtSeedObj = pObj;
    _gxtSeedKey = pKey;
    _gxtSeedInit = pInit;
    _gxtSeedComputed = pComputed;
    _gxtSeedValue = pValue;
  }
  return true;
}

function descriptorForField([target, key, desc]: ElementDescriptor): DecoratorPropertyDescriptor {
  assert(
    `You attempted to use @tracked on ${key}, but that element is not a class field. @tracked is only usable on class fields. Native getters and setters will autotrack add any tracked fields they encounter, so there is no need mark getters and setters with @tracked.`,
    !desc || (!desc.value && !desc.get && !desc.set)
  );

  // Always pass a function initializer to trackedData so GXT's cellFor creates
  // a cell with a safe getter (instead of reading back through the property
  // descriptor, which causes infinite recursion).
  const initializer = desc?.initializer ?? (() => undefined);
  let { getter, setter } = trackedData<any, any>(key, initializer);

  function get(this: object): unknown {
    // GXT mode: read THE single gxt cell (cellFor === tagFor per-property cell).
    // The read entangles GXT render formulas; `_gxtTrackedCellGet` also consumes
    // `tagFor(obj,key)` (the same cell) so Ember's createCache/computed tracking
    // captures the dependency. Classic mode: read the real @glimmer/validator
    // `trackedData` storage (its getter already consumes the per-key tag via
    // Glimmer's standard autotracking, so no extra consumeTag here).
    let value = __GXT_MODE__ ? _gxtTrackedCellGet(this, key, initializer, getter) : getter(this);

    // Add the tag of the returned value if it is an array, since arrays
    // should always cause updates if they are consumed and then changed
    if (Array.isArray(value) || isEmberArray(value)) {
      consumeTag(tagFor(value, '[]'));
    }

    return value;
  }

  function set(this: object, newValue: unknown): void {
    // GXT backtracking detection for @tracked properties (render-pass based:
    // "modified X after it was rendered"). Slice-10 (Cluster B): typed bridge,
    // optional method, guarded.
    if (__GXT_MODE__ && DEBUG) {
      getGxtRenderer()?.backtracking.checkBacktracking?.(this, key);
      // track()/render-frame backtracking ("updated X after using it in the
      // same computation") on the SAME single cell the getter recorded its read
      // into. Replaces the assertion formerly inside trackedData.setter.
      _gxtAssertTrackedBacktrack?.(tagFor(this, key), key, this);
    }

    if (__GXT_MODE__) {
      // Write THE single gxt cell (cellFor === tagFor per-property cell). This
      // is the only value store for the GXT @tracked path — the former
      // trackedData dual-write is gone.
      const wrote = _gxtTrackedCellSet(this, key, newValue, initializer);
      if (!wrote) {
        // Bridge not installed yet (metal module-init window, before the gxt
        // renderer is set). Stash in the classic storage so a pre-install READ
        // still sees it, and flag (this, key) so the cell's first post-install
        // creation migrates this value in instead of seeding the initializer
        // default (which would silently drop this write). Framework-init-only.
        setter(this, newValue);
        _gxtFlagPendingWindowWrite(this, key);
      }
      // Public notification — the SINGLE coherence path. notifyPropertyChange:
      //   • markObjectAsDirty → dirtyTagFor(obj,key) + dirtyTagFor(obj,SELF_TAG)
      //     → marks the SHARED cell's tag dirty so createCache/computed/observers
      //     watching `key`/`[]`/SELF_TAG invalidate;
      //   • fires sync + (schedules) async observers;
      //   • recomputes dependent computed properties;
      //   • triggers the GXT re-render (with `newValue` forwarded).
      // This one call SUBSUMES the former GXT-only amplifications that existed
      // ONLY to keep the two now-unified cell systems coherent: the explicit
      // `dirtyTagFor(SELF_TAG)` + `dirtyTagFor(key)` double-dirty and the
      // standalone `triggerReRender`/`setPendingSync` block (both of which
      // markObjectAsDirty + notifyPropertyChange's own triggerReRender already
      // perform). The cell's own `.update()` above handles GXT render
      // entanglement; notifyPropertyChange handles the classic-tag + observer
      // side. Forward `newValue` as the 4th arg so the enqueue site can call
      // `cellFor(this,key,true).update(newValue)` without re-reading the getter.
      notifyPropertyChange(this, key, null, newValue);
    } else {
      setter(this, newValue);
    }
  }

  let newDesc = {
    enumerable: true,
    configurable: true,
    isTracked: true,

    get,
    set,
  };

  COMPUTED_SETTERS.add(set);

  metaFor(target).writeDescriptors(key, new TrackedDescriptor(get, set));

  return newDesc;
}

export class TrackedDescriptor {
  constructor(
    private _get: () => unknown,
    private _set: (value: unknown) => void
  ) {
    CHAIN_PASS_THROUGH.add(this);
  }

  get(obj: object): unknown {
    return this._get.call(obj);
  }

  set(obj: object, _key: string, value: unknown): void {
    this._set.call(obj, value);
  }
}
