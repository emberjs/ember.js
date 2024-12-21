/**
  In order to tell Ember a value might change, we need to mark it as trackable.
  Trackable values are values that:

  - Can change over their component’s lifetime and
  - Should cause Ember to rerender if and when they change

  We can do this by marking the field with the `@tracked` decorator.

  ### Caching a getter value

  The `@cached` decorator can be used on getters in order to cache the
  return value of the getter.

  This method adds an extra overhead to each memoized getter, therefore caching
  the values should not be the default strategy, but used in last resort.

  @module @glimmer/tracking
  @public
*/

import { meta as metaFor } from '@ember/-internals/meta';
import { isEmberArray } from '@ember/array/-internals';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import {
  consumeTag,
  dirtyTagFor,
  tagFor,
  trackedData,
  createCache,
  getValue,
} from '@glimmer/validator';
import type { ElementDescriptor } from '@ember/-internals/metal';
import { CHAIN_PASS_THROUGH } from '@ember/-internals/metal/lib/chain-tags';
import type {
  ExtendedMethodDecorator,
  DecoratorPropertyDescriptor,
} from '@ember/-internals/metal/lib/decorator';
import {
  COMPUTED_SETTERS,
  isElementDescriptor,
  setClassicDecorator,
} from '@ember/-internals/metal/lib/decorator';
import { SELF_TAG } from '@ember/-internals/metal/lib/tags';

/**
  Marks a property as tracked. By default, values that are rendered in Ember app
  templates are _static_, meaning that updates to them won't cause the
  application to rerender. Marking a property as tracked means that when that
  property changes, any templates that used that property, directly or
  indirectly, will rerender. For instance, consider this component:

  ```handlebars
  <div>Count: {{this.count}}</div>
  <div>Times Ten: {{this.timesTen}}</div>
  <div>
    <button {{on "click" this.plusOne}}>
      Plus One
    </button>
  </div>
  ```

  ```javascript
  import Component from '@glimmer/component';
  import { tracked } from '@glimmer/tracking';
  import { action } from '@ember/object';

  export default class CounterComponent extends Component {
    @tracked count = 0;

    get timesTen() {
      return this.count * 10;
    }

    @action
    plusOne() {
      this.count += 1;
    }
  }
  ```

  Both the `{{this.count}}` and the `{{this.timesTen}}` properties in the
  template will update whenever the button is clicked. Any tracked properties
  that are used in any way to calculate a value that is used in the template
  will cause a rerender when updated - this includes through method calls and
  other means:

  ```javascript
  import Component from '@glimmer/component';
  import { tracked } from '@glimmer/tracking';

  class Entry {
    @tracked name;
    @tracked phoneNumber;

    constructor(name, phoneNumber) {
      this.name = name;
      this.phoneNumber = phoneNumber;
    }
  }

  export default class PhoneBookComponent extends Component {
    entries = [
      new Entry('Pizza Palace', 5551234),
      new Entry('1st Street Cleaners', 5554321),
      new Entry('Plants R Us', 5552468),
    ];

    // Any usage of this property will update whenever any of the names in the
    // entries arrays are updated
    get names() {
      return this.entries.map(e => e.name);
    }

    // Any usage of this property will update whenever any of the numbers in the
    // entries arrays are updated
    get numbers() {
      return this.getFormattedNumbers();
    }

    getFormattedNumbers() {
      return this.entries
        .map(e => e.phoneNumber)
        .map(number => {
          let numberString = '' + number;

          return numberString.slice(0, 3) + '-' + numberString.slice(3);
        });
    }
  }
  ```

  It's important to note that setting tracked properties will always trigger an
  update, even if the property is set to the same value as it was before.

  ```js
  let entry = new Entry('Pizza Palace', 5551234);
  // if entry was used when rendering, this would cause a rerender, even though
  // the name is being set to the same value as it was before
  entry.name = entry.name;
  ```

  `tracked` can also be used with the classic Ember object model in a similar
  manner to classic computed properties:

  ```javascript
  import EmberObject from '@ember/object';
  import { tracked } from '@glimmer/tracking';

  const Entry = EmberObject.extend({
    name: tracked(),
    phoneNumber: tracked()
  });
  ```

  Often this is unnecessary, but to ensure robust auto-tracking behavior it is
  advisable to mark tracked state appropriately wherever possible.
  This form of `tracked` also accepts an optional configuration object
  containing either an initial `value` or an `initializer` function (but not
  both).

  ```javascript
  import EmberObject from '@ember/object';
  import { tracked } from '@glimmer/tracking';

  const Entry = EmberObject.extend({
    name: tracked({ value: 'Zoey' }),
    favoriteSongs: tracked({
      initializer: () => ['Raspberry Beret', 'Time After Time']
    })
  });
  ```

  @method tracked
  @static
  @for @glimmer/tracking
  @public
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

  let { getter, setter } = trackedData<any, any>(key, desc ? desc.initializer : undefined);

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
  constructor(private _get: () => unknown, private _set: (value: unknown) => void) {
    CHAIN_PASS_THROUGH.add(this);
  }

  get(obj: object): unknown {
    return this._get.call(obj);
  }

  set(obj: object, _key: string, value: unknown): void {
    this._set.call(obj, value);
  }
}

/**
  Gives the getter a caching behavior. The return value of the getter
  will be cached until any of the properties it is entangled with
  are invalidated. This is useful when a getter is expensive and
  used very often.

  For instance, in this `GuestList` class, we have the `sortedGuests`
  getter that sorts the guests alphabetically:

  ```javascript
    import { tracked } from '@glimmer/tracking';

    class GuestList {
      @tracked guests = ['Zoey', 'Tomster'];

      get sortedGuests() {
        return this.guests.slice().sort()
      }
    }
  ```

  Every time `sortedGuests` is accessed, a new array will be created and sorted,
  because JavaScript getters do not cache by default. When the guest list
  is small, like the one in the example, this is not a problem. However, if
  the guest list were to grow very large, it would mean that we would be doing
  a large amount of work each time we accessed `sortedGuests`. With `@cached`,
  we can cache the value instead:

  ```javascript
    import { tracked, cached } from '@glimmer/tracking';

    class GuestList {
      @tracked guests = ['Zoey', 'Tomster'];

      @cached
      get sortedGuests() {
        return this.guests.slice().sort()
      }
    }
  ```

  Now the `sortedGuests` getter will be cached based on autotracking.
  It will only rerun and create a new sorted array when the guests tracked
  property is updated.


  ### Tradeoffs

  Overuse is discouraged.

  In general, you should avoid using `@cached` unless you have confirmed that
  the getter you are decorating is computationally expensive, since `@cached`
  adds a small amount of overhead to the getter.
  While the individual costs are small, a systematic use of the `@cached`
  decorator can add up to a large impact overall in your app.
  Many getters and tracked properties are only accessed once during rendering,
  and then never rerendered, so adding `@cached` when unnecessary can
  negatively impact performance.

  Also, `@cached` may rerun even if the values themselves have not changed,
  since tracked properties will always invalidate.
  For example updating an integer value from `5` to an other `5` will trigger
  a rerun of the cached properties building from this integer.

  Avoiding a cache invalidation in this case is not something that can
  be achieved on the `@cached` decorator itself, but rather when updating
  the underlying tracked values, by applying some diff checking mechanisms:

  ```javascript
  if (nextValue !== this.trackedProp) {
    this.trackedProp = nextValue;
  }
  ```

  Here equal values won't update the property, therefore not triggering
  the subsequent cache invalidations of the `@cached` properties who were
  using this `trackedProp`.

  Remember that setting tracked data should only be done during initialization,
  or as the result of a user action. Setting tracked data during render
  (such as in a getter), is not supported.

  @method cached
  @static
  @for @glimmer/tracking
  @public
 */

export const cached: MethodDecorator = (...args: any[]) => {
  const [target, key, descriptor] = args;

  // Error on `@cached()`, `@cached(...args)`, and `@cached propName = value;`
  if (DEBUG && target === undefined) throwCachedExtraneousParens();
  if (
    DEBUG &&
    (typeof target !== 'object' ||
      typeof key !== 'string' ||
      typeof descriptor !== 'object' ||
      args.length !== 3)
  ) {
    throwCachedInvalidArgsError(args);
  }
  if (DEBUG && (!('get' in descriptor) || typeof descriptor.get !== 'function')) {
    throwCachedGetterOnlyError(key);
  }

  const caches = new WeakMap();
  const getter = descriptor.get;

  descriptor.get = function (): unknown {
    if (!caches.has(this)) {
      caches.set(this, createCache(getter.bind(this)));
    }

    return getValue(caches.get(this));
  };
};

function throwCachedExtraneousParens(): never {
  throw new Error(
    'You attempted to use @cached(), which is not necessary nor supported. Remove the parentheses and you will be good to go!'
  );
}

function throwCachedGetterOnlyError(key: string): never {
  throw new Error(`The @cached decorator must be applied to getters. '${key}' is not a getter.`);
}

function throwCachedInvalidArgsError(args: unknown[] = []): never {
  throw new Error(
    `You attempted to use @cached on with ${
      args.length > 1 ? 'arguments' : 'an argument'
    } ( @cached(${args
      .map((d) => `'${d}'`)
      .join(
        ', '
      )}), which is not supported. Dependencies are automatically tracked, so you can just use ${'`@cached`'}`
  );
}
