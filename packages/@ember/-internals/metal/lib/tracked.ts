import { meta as metaFor } from '@ember/-internals/meta/lib/meta';
import { isEmberArray } from '@ember/array/-internals';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { consumeTag, untrack } from '@glimmer/validator/lib/tracking';
import * as validatorTracking from '@glimmer/validator/lib/tracking';
import { dirtyTagFor, tagFor } from '@glimmer/validator/lib/meta';
import { trackedData } from '@glimmer/validator/lib/tracked-data';
import { trackedValue, type TrackedValue } from '@glimmer/validator/lib/tracked-value';
import { getGxtRenderer } from '@ember/-internals/gxt-backend/gxt-bridge';
import type { ElementDescriptor } from '..';
import { CHAIN_PASS_THROUGH } from './chain-tags';
import type { ExtendedMethodDecorator, DecoratorPropertyDescriptor } from './decorator';
import { COMPUTED_SETTERS, isElementDescriptor, setClassicDecorator } from './decorator';
import { notifyPropertyChange } from './property_events';
import { SELF_TAG } from './tags';
import {
  type Decorator,
  identifyModernDecoratorArgs,
  isModernDecoratorArgs,
  type StandardAccessorDecorator,
  type StandardFieldDecorator,
} from './decorator-util';

// GXT-only backtracking bookkeeping on the single tracked cell. These live on
// the gxt-backend validator shim, which GXT builds resolve
// `@glimmer/validator/lib/tracking` to (classic `@glimmer/validator` does not
// export them, so they are `undefined` there); only ever invoked under
// `__GXT_MODE__`. Accessed via the namespace import to avoid a classic-build
// link error on a missing named export.
const _gxtRecordTrackedRead = (validatorTracking as { recordTrackedCellRead?: unknown })
  .recordTrackedCellRead as
  | ((cell: unknown, key: string | symbol, obj: object) => void)
  | undefined;
const _gxtAssertTrackedBacktrack = (validatorTracking as { assertTrackedCellBacktrack?: unknown })
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
/**
 * Reactivity options for the standalone `tracked(value, options)` form.
 *
 * - `equals` decides whether writing a value notifies consumers; it defaults to
 *   `Object.is`.
 * - `description` is used in development for debugging.
 *
 * `equals` is a function-typed property (rather than method syntax) on purpose:
 * this keeps its parameters checked strictly, so passing an `equals` typed for
 * the wrong value type is a type error instead of being silently accepted.
 */
interface TrackedValueOptions<Value> {
  equals?: (a: Value, b: Value) => boolean;
  description?: string;
}

/**
 * Options for `tracked` used as a decorator, or as a field on a *classic* class
 * (`EmberObject.extend({ foo: tracked({ value }) })`).
 *
 * All properties are optional because this single shape backs several usages:
 * classic-field defaults (`tracked({ value })` / `tracked({ initializer })`) and
 * options-only native decorators (`@tracked({ equals })`). The mutually
 * exclusive combinations (e.g. both `value` and `initializer`) and the
 * classic-only restriction on `value`/`initializer` are enforced at runtime via
 * assertions rather than in the type, matching the runtime `isDecoratorOptions`
 * check that accepts any object composed of these keys.
 *
 * - `value` / `initializer` supply a default value and are only valid on classic
 *   classes; native classes use class field initializers instead.
 * - `equals` / `description` configure reactivity, mirroring
 *   {@link TrackedValueOptions}.
 */
interface TrackedDecoratorOptions {
  value?: any;
  initializer?: () => any;
  // `equals`/`description` intentionally duplicate `TrackedValueOptions` rather
  // than extending it: this form declares `equals` in *method* syntax so its
  // parameters are checked loosely. That lets a typed `equals` (e.g.
  // `(a: number, b: number) => boolean`) still select this decorator overload
  // instead of falling through to the standalone-value overload — whereas
  // `TrackedValueOptions.equals` is a strict function-typed property (checked
  // against the value's type) on purpose.
  equals?(a: any, b: any): boolean;
  description?: string;
}

// `PropertyDecorator` covers the `(target, key)` call TypeScript emits for
// native class fields with legacy decorators; `ExtendedMethodDecorator` covers
// the classic-class call; the standard decorator types cover fields and
// auto-accessors with standard (stage 3) decorators.
export type TrackedDecorator = ExtendedMethodDecorator &
  PropertyDecorator &
  StandardFieldDecorator &
  StandardAccessorDecorator;

/**
 * `tracked` as a decorator factory: `@tracked({ equals })`, or on classic
 * classes `tracked({ value })` / `tracked({ initializer })`.
 */
export function tracked(propertyDesc: TrackedDecoratorOptions): TrackedDecorator;
/**
 * `tracked` as a bare decorator: `@tracked foo = 1`.
 */
export function tracked(target: object, key: string): void;
export function tracked(
  target: object,
  key: string,
  desc: DecoratorPropertyDescriptor
): DecoratorPropertyDescriptor;
/**
 * `tracked` as a bare standard (stage 3) decorator: `@tracked foo = 1` or
 * `@tracked accessor foo = 1`.
 */
export function tracked(value: undefined, context: ClassFieldDecoratorContext): void;
export function tracked<This, Value>(
  value: ClassAccessorDecoratorTarget<This, Value>,
  context: ClassAccessorDecoratorContext<This, Value>
): void;
/**
 * `tracked` as a standalone reactive value, usable outside of classes:
 * `const count = tracked(0)`.
 */
export function tracked<Value>(
  initialValue: Value,
  options?: TrackedValueOptions<Value>
): TrackedValue<Value>;
export function tracked(
  ...args: any[]
): TrackedDecorator | DecoratorPropertyDescriptor | TrackedValue<any> {
  if (isModernDecoratorArgs(args)) {
    // TODO: cast is a lie, keeping the public types unchanged for now
    return tracked2023(args) as unknown as DecoratorPropertyDescriptor;
  }

  assert(
    `@tracked can only be used directly as a native decorator. If you're using tracked in classic classes, add parenthesis to call it like a function: tracked()`,
    !(isElementDescriptor(args.slice(0, 3)) && args.length === 5 && args[4] === true)
  );

  if (isElementDescriptor(args)) {
    /*
      Native-decorator form. The runtime invokes us with `(target, key, desc)`
      and consumes the returned `DecoratorPropertyDescriptor`. The public API is
      the decorated field itself — reading it consumes, assigning it dirties.

      ```js
      class Counter {
        @tracked count = 0;
      }
      ```
    */
    return descriptorForField(args);
  }

  if (args.length === 0 || (args.length === 1 && isDecoratorOptions(args[0]))) {
    /*
      Decorator-factory / classic-field form. Returns an
      `ExtendedMethodDecorator`. The public API is the resulting property on
      instances (get/set), with any default supplied by `value`/`initializer`.

      ```js
      class Counter {
        @tracked({ equals: (a, b) => a === b }) count = 0;
      }

      const Person = EmberObject.extend({
        name: tracked({ value: 'Zoey' }),
      });
      ```
    */
    return makeTrackedDecorator(args[0]);
  }

  let [initialValue, options] = args;

  assert(
    `tracked() may only receive an options object containing 'equals' or 'description' as its second argument, received ${options}`,
    options === undefined || (typeof options === 'object' && options !== null)
  );

  /*
    Standalone-value form. Returns a `TrackedValue` usable outside of classes.

    ```js
    const count = tracked(0);

    count.value;                // read (consumes), `Object.is`-based equality
    count.value = 1;            // write (dirties)
    count.get();                // function shorthand for reading
    count.set(2);               // returns `true` if the value changed
    count.update((n) => n + 1); // write from current, without consuming
    count.freeze();             // prevent further writes
    ```
  */
  return trackedValue(initialValue, options);
}

const DECORATOR_OPTION_KEYS = ['value', 'initializer', 'equals', 'description'];

function isDecoratorOptions(value: unknown): value is TrackedDecoratorOptions {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  let proto = Object.getPrototypeOf(value);

  if (proto !== Object.prototype && proto !== null) {
    return false;
  }

  return Object.keys(value).every((key) => DECORATOR_OPTION_KEYS.includes(key));
}

function makeTrackedDecorator(propertyDesc?: TrackedDecoratorOptions): TrackedDecorator {
  if (DEBUG && propertyDesc) {
    assert(
      `The options object passed to tracked() may only contain a 'value' or an 'initializer' property, not both. Received: [${Object.keys(
        propertyDesc
      )}]`,
      !('value' in propertyDesc && 'initializer' in propertyDesc)
    );

    assert(
      `The initializer passed to tracked must be a function. Received ${propertyDesc.initializer}`,
      !('initializer' in propertyDesc) || typeof propertyDesc.initializer === 'function'
    );

    assert(
      `The 'equals' option passed to tracked must be a function. Received ${propertyDesc.equals}`,
      !('equals' in propertyDesc) || typeof propertyDesc.equals === 'function'
    );

    assert(
      `The 'description' option passed to tracked must be a string. Received ${propertyDesc.description}`,
      !('description' in propertyDesc) || typeof propertyDesc.description === 'string'
    );
  }

  let initializer = propertyDesc ? propertyDesc.initializer : undefined;
  let value = propertyDesc ? propertyDesc.value : undefined;
  let hasInitialValue =
    propertyDesc !== undefined && ('value' in propertyDesc || 'initializer' in propertyDesc);
  let options = { equals: propertyDesc?.equals, description: propertyDesc?.description };

  let decorator = function (
    target: object,
    key: string,
    desc?: DecoratorPropertyDescriptor,
    _meta?: any,
    isClassicDecorator?: boolean
  ): DecoratorPropertyDescriptor {
    let decoratorArgs = Array.from(arguments);
    if (isModernDecoratorArgs(decoratorArgs)) {
      assert(
        `You attempted to set a default value for ${decoratorArgs[1].name?.toString()} with the @tracked({ value: 'default' }) syntax. You can only use this syntax with classic classes. For native classes, you can use class initializers: @tracked field = 'default';`,
        !hasInitialValue
      );
      // TODO: cast is a lie, keeping the public types unchanged for now
      return tracked2023(decoratorArgs, options) as unknown as DecoratorPropertyDescriptor;
    }

    assert(
      `You attempted to set a default value for ${key} with the @tracked({ value: 'default' }) syntax. You can only use this syntax with classic classes. For native classes, you can use class initializers: @tracked field = 'default';`,
      isClassicDecorator || !hasInitialValue
    );

    let fieldDesc = isClassicDecorator ? { initializer: initializer || (() => value) } : desc;

    return descriptorForField([target, key, fieldDesc], options);
  };

  setClassicDecorator(decorator);

  return decorator as TrackedDecorator;
}

if (DEBUG) {
  // Normally this isn't a classic decorator, but we want to throw a helpful
  // error in development so we need it to treat it like one
  setClassicDecorator(tracked);
}

// ── GXT @tracked storage ───────────────────────────────────────────────────
// In GXT mode a `@tracked` property is backed by exactly one gxt cell,
// `cellFor(obj, key)`, which is also the cell `tagFor(obj, key)` resolves to
// (gxt keeps both in one per-property store). The accessor reads and writes
// that cell, and Ember's createCache/computed/observer tracking consumes the
// same cell via `consumeTag(tagFor(obj, key))`. Classic mode keeps
// `@glimmer/validator`'s `trackedData`.
//
// Re-entrancy guard (load-bearing): gxt's `cellFor` creates the cell with
// `new Cell(obj[key])` and `tagFor` creates a lazy formula `() => obj[key]`.
// For a `@tracked` property `obj[key]` is this very accessor, so the first
// access re-enters the getter before the cell exists and recurses forever.
// The guard makes that re-entrant `obj[key]` read return the memoized
// initializer value, which seeds the cell and resolves the lazy formula;
// after that the cell is self-sufficient.
let _gxtSeedObj: object | null = null;
let _gxtSeedKey: string | symbol | null = null;
let _gxtSeedInit: (() => unknown) | null = null;
let _gxtSeedComputed = false;
let _gxtSeedValue: unknown;

// Pre-install-window write migration. A `@tracked` write that lands BEFORE the
// gxt `cellFor` bridge is installed (the metal module-init window) has no cell
// to write yet, so it is stashed in the classic `trackedData` storage and the
// (obj, key) is flagged here. On the cell's first post-install creation we
// migrate that stashed value into the cell (see `_gxtTrackedCellGet`). Only
// flagged props ever read classic storage.
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
  classicGetter: (obj: object) => unknown,
  record = true
): unknown {
  // Re-entrant read from gxt cell creation / lazy-formula resolution — return
  // the memoized seed instead of recursing back through this accessor.
  if (_gxtSeedObj === obj && _gxtSeedKey === key) {
    if (!_gxtSeedComputed) {
      // Seed the cell being created. If a value was written during the
      // pre-install window, migrate it from classic storage; otherwise use the
      // initializer default (normal props never read classic storage).
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
    // `record` is false for the setter's own `equals` peek, which is not a use.
    if (DEBUG && record) _gxtRecordTrackedRead?.(tag, key, obj);
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
    const cell = _cellFor(obj, key, /* skipDefine */ true) as
      | { update: (v: unknown) => void }
      | undefined;
    // This relies on the gxt cell exposing a synchronous `update()` (tagFor's
    // lazy MergedCell extends Cell). Assert it in DEBUG so a gxt contract
    // change fails loudly here rather than silently dropping a @tracked write.
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

function descriptorForField(
  [target, key, desc]: ElementDescriptor,
  options?: { equals?: (a: any, b: any) => boolean; description?: string }
): DecoratorPropertyDescriptor {
  assert(
    `You attempted to use @tracked on ${key}, but that element is not a class field. @tracked is only usable on class fields. Native getters and setters will autotrack add any tracked fields they encounter, so there is no need mark getters and setters with @tracked.`,
    !desc || (!desc.value && !desc.get && !desc.set)
  );

  let initializer: (() => unknown) | undefined;
  if (__GXT_MODE__) {
    // GXT: always pass a function initializer to trackedData so GXT's cellFor
    // creates a cell with a safe getter (instead of reading back through the
    // property descriptor, which causes infinite recursion).
    initializer = (desc ? desc.initializer : undefined) ?? (() => undefined);
  }
  let { getter, setter } = trackedData<any, any>(
    key,
    __GXT_MODE__ ? initializer : desc ? desc.initializer : undefined
  );
  let equals = options?.equals;

  function get(this: object): unknown {
    // GXT mode: read the property's gxt cell, which also consumes
    // `tagFor(obj, key)` so Ember's createCache/computed tracking captures the
    // dependency. Classic mode: the `trackedData` getter consumes the tag.
    let value = __GXT_MODE__
      ? _gxtTrackedCellGet(this, key, initializer as () => unknown, getter)
      : getter(this);

    // Add the tag of the returned value if it is an array, since arrays
    // should always cause updates if they are consumed and then changed
    if (Array.isArray(value) || isEmberArray(value)) {
      consumeTag(tagFor(value, '[]'));
    }

    return value;
  }

  function set(this: object, newValue: unknown): void {
    // GXT: a whole-statement gate, so that classic dists fold it away (rollup
    // does not fold a `__GXT_MODE__ ? … : …` inside an `untrack` callback, which
    // kept `_gxtTrackedCellGet` and its gxt-bridge read alive in classic dists).
    // The classic path below is main's.
    if (__GXT_MODE__) {
      // `equals` peeks at the property's gxt cell without recording a read.
      if (
        equals !== undefined &&
        equals(
          untrack(() => _gxtTrackedCellGet(this, key, initializer as () => unknown, getter, false)),
          newValue
        )
      ) {
        return;
      }

      // GXT backtracking detection for @tracked properties (render-pass based:
      // "modified X after it was rendered").
      if (DEBUG) {
        getGxtRenderer()?.backtracking.checkBacktracking?.(this, key);
        // track()/render-frame backtracking ("updated X after using it in the
        // same computation") on the same cell the getter recorded its read into.
        _gxtAssertTrackedBacktrack?.(tagFor(this, key), key, this);
      }

      // Write the property's gxt cell, the only value store on the GXT path.
      const wrote = _gxtTrackedCellSet(this, key, newValue, initializer as () => unknown);
      if (!wrote) {
        // Bridge not installed yet (metal module-init window, before the gxt
        // renderer is set). Stash in the classic storage so a pre-install READ
        // still sees it, and flag (this, key) so the cell's first post-install
        // creation migrates this value in instead of seeding the initializer
        // default (which would silently drop this write). Framework-init-only.
        setter(this, newValue);
        _gxtFlagPendingWindowWrite(this, key);
      }
      // notifyPropertyChange dirties the `key` and SELF_TAG tags (invalidating
      // createCache/computed/observers), fires observers, recomputes dependent
      // computed properties and triggers the GXT re-render. `newValue` is
      // forwarded so the trigger does not re-read the getter.
      notifyPropertyChange(this, key, null, newValue);
      return;
    }

    if (
      equals !== undefined &&
      equals(
        untrack(() => getter(this)),
        newValue
      )
    ) {
      return;
    }

    setter(this, newValue);
    dirtyTagFor(this, SELF_TAG);
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

function tracked2023(
  args: Parameters<Decorator>,
  options?: { equals?: (a: any, b: any) => boolean; description?: string }
) {
  const dec = identifyModernDecoratorArgs(args);
  switch (dec.kind) {
    case 'field':
      dec.context.addInitializer(function (this: any) {
        let initial = this[dec.context.name];
        Object.defineProperty(
          this,
          dec.context.name,
          descriptorForField(
            [this, dec.context.name as string, { initializer: () => initial }],
            options
          ) as any
        );
      });
      return;
    case 'accessor': {
      let equals = options?.equals;
      return {
        get(this: object) {
          consumeTag(tagFor(this, dec.context.name));
          let value = dec.value.get.call(this);
          if (Array.isArray(value) || isEmberArray(value)) {
            consumeTag(tagFor(value, '[]'));
          }
          return value;
        },
        set(this: object, value: unknown) {
          if (
            equals !== undefined &&
            equals(
              untrack(() => dec.value.get.call(this)),
              value
            )
          ) {
            return;
          }
          dirtyTagFor(this, dec.context.name);
          dirtyTagFor(this, SELF_TAG);
          return dec.value.set.call(this, value);
        },
      };
    }
    default:
      throw new Error(`unimplemented: tracked on ${dec.kind} ${dec.context.name?.toString()}`);
  }
}
