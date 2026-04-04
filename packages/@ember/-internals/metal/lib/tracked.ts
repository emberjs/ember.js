import { meta as metaFor } from '@ember/-internals/meta';
import { isEmberArray } from '@ember/array/-internals';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
// import { consumeTag, dirtyTagFor, tagFor, trackedData } from '@glimmer/validator';
import { validator } from '@lifeart/gxt/glimmer-compatibility';
import { dirtyTagFor, consumeTag as compatConsumeTag, tagFor as compatTagFor } from '@glimmer/validator';

import type { ElementDescriptor } from '..';
import { CHAIN_PASS_THROUGH } from './chain-tags';
import type { ExtendedMethodDecorator, DecoratorPropertyDescriptor } from './decorator';
import { COMPUTED_SETTERS, isElementDescriptor, setClassicDecorator } from './decorator';
import { SELF_TAG } from './tags';

const {
  consumeTag: _nativeConsumeTag, tagFor: _nativeTagFor, trackedData
} = validator;

// Use compat versions that integrate with createCache tracking
const consumeTag = compatConsumeTag;
const tagFor = compatTagFor;


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
    let value = getter(this);

    // Consume the property tag so that createCache tracking captures this
    // dependency. Without this, GXT cell reads from trackedData.getter are
    // invisible to our compat createCache's tag-based invalidation system.
    consumeTag(tagFor(this, key as string));

    // In GXT mode, synchronize the cellFor cell for this property.
    // trackedData from @lifeart/gxt/glimmer-compatibility and cellFor from
    // @lifeart/gxt may use different internal cell instances in Vite dev mode
    // (module duplication). GXT's $_tag formulas only track cellFor cells.
    // By reading from cellFor here, we ensure the formula's tracker captures
    // this cell as a dependency. The setter's cellFor.update() call ensures
    // the cell is dirtied when the property changes.
    if ((globalThis as any).__GXT_MODE__) {
      const _cellFor = (globalThis as any).__gxtCellFor;
      if (typeof _cellFor === 'function') {
        try {
          // Use skipDefine=true to avoid replacing the tracked getter/setter.
          // This creates the cell in cellFor's storage without installing
          // a getter/setter on the property.
          const cell = _cellFor(this, key, /* skipDefine */ true);
          if (cell) {
            // Silently sync the cell value without triggering dirty marking.
            // We set _value directly to avoid adding to tagsToRevalidate
            // during render, which would cause infinite re-render loops.
            if (cell._value !== value) {
              cell._value = value;
            }
            // Read cell.value to add this cell to the current GXT tracker.
            // This is the key step: the formula's tracker now knows about
            // this cell, so when the setter's cellFor.update() dirties it,
            // syncDom will re-evaluate the formula.
            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
            cell.value;
          }
        } catch { /* ignore */ }
      }
    }

    // Add the tag of the returned value if it is an array, since arrays
    // should always cause updates if they are consumed and then changed
    if (Array.isArray(value) || isEmberArray(value)) {
      consumeTag(tagFor(value, '[]'));
    }

    return value;
  }

  function set(this: object, newValue: unknown): void {
    setter(this, newValue);
    // Directly update the GXT cell for this property using cellFor.
    // trackedData.setter (above) updates the cell via GXT's native validator,
    // but the cell may not be in the same tracking system as the formulas
    // created by gxtEffect in the compat layer. Using cellFor ensures the
    // cell that GXT effects track is also dirtied.
    if ((globalThis as any).__GXT_MODE__) {
      const _cellFor = (globalThis as any).__gxtCellFor;
      if (typeof _cellFor === 'function') {
        try {
          const cell = _cellFor(this, key, /* skipDefine */ true);
          if (cell) cell.update(newValue);
        } catch { /* ignore */ }
      }
    }
    dirtyTagFor(this, SELF_TAG);
    // Also dirty the property-specific tag so observers watching 'key' or
    // 'key.[]' detect the change via getChainTagsForKey.
    dirtyTagFor(this, key);
    // In GXT mode, notify the Ember property system so that sync observers
    // and tag dirtying work correctly for QP tracking.
    if ((globalThis as any).__GXT_MODE__) {
      const _notifyPropChange = (globalThis as any).__emberNotifyPropertyChange;
      if (typeof _notifyPropChange === 'function') {
        _notifyPropChange(this, key);
      }
    }
    // Notify GXT for cross-object reactivity — when a tracked property changes
    // on a non-component object (e.g., a Counter or Person class), dirty all
    // component cells that hold a reference to this object. This ensures that
    // GXT formulas like {{this.counter.countAlias}} re-evaluate.
    // Skip during rendering to avoid breaking the initial render.
    if (!(globalThis as any).__gxtCurrentlyRendering) {
      const triggerReRender = (globalThis as any).__gxtTriggerReRender;
      if (typeof triggerReRender === 'function') {
        triggerReRender(this, key);
      }
      // Schedule a pending sync so runTask → __gxtSyncDomNow picks it up
      const schedule = (globalThis as any).__gxtExternalSchedule;
      if (typeof schedule === 'function') {
        schedule();
      }
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
