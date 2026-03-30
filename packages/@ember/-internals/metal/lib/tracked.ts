import { meta as metaFor } from '@ember/-internals/meta';
import { isEmberArray } from '@ember/array/-internals';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
// import { consumeTag, dirtyTagFor, tagFor, trackedData } from '@glimmer/validator';
import { validator } from '@lifeart/gxt/glimmer-compatibility';

import type { ElementDescriptor } from '..';
import { CHAIN_PASS_THROUGH } from './chain-tags';
import type { ExtendedMethodDecorator, DecoratorPropertyDescriptor } from './decorator';
import { COMPUTED_SETTERS, isElementDescriptor, setClassicDecorator } from './decorator';
import { SELF_TAG } from './tags';

const {
  consumeTag, dirtyTagFor: _dirtyTagFor, tagFor, trackedData
} = validator;

// Wrap dirtyTagFor to handle Symbol keys which GXT's raw dirtyTagFor can't handle
function dirtyTagFor(obj: any, key: any) {
  const safeKey = typeof key === 'symbol' ? (key.description || key.toString()) : key;
  try {
    // Ensure obj has a constructor for GXT's debug label (t.constructor.name)
    if (obj && typeof obj === 'object' && !obj.constructor) {
      Object.defineProperty(obj, 'constructor', {
        value: Object, writable: true, configurable: true, enumerable: false,
      });
    }
    return _dirtyTagFor(obj, safeKey);
  } catch {
    // GXT's dirtyTagFor may fail for objects without constructor
  }
}


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

    // Add the tag of the returned value if it is an array, since arrays
    // should always cause updates if they are consumed and then changed
    if (Array.isArray(value) || isEmberArray(value)) {
      consumeTag(tagFor(value, '[]'));
    }

    return value;
  }

  function set(this: object, newValue: unknown): void {
    setter(this, newValue);
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
