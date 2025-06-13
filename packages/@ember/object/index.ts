import { assert } from '@ember/debug';
import type { ElementDescriptor, ExtendedMethodDecorator } from '@ember/-internals/metal';
import {
  isElementDescriptor,
  setClassicDecorator,
  hasListeners,
  addObserver,
  removeObserver,
  get,
  set,
} from '@ember/-internals/metal';
import { getFactoryFor } from '@ember/-internals/container';
import CoreObject from '@ember/object/core';
import { peekMeta } from '@ember/-internals/meta';

export {
  notifyPropertyChange,
  defineProperty,
  get,
  set,
  getProperties,
  setProperties,
  computed,
  trySet,
} from '@ember/-internals/metal';

type ObserverMethod<Target, Sender> =
  | (keyof Target & string)
  | ((this: Target, sender: Sender, key: string, value: any, rev: number) => void);

/**
@module @ember/object
*/

/**
  `EmberObject` is the main base class for all Ember objects.

  @class EmberObject
  @extends CoreObject
  @public
*/
class EmberObject extends CoreObject {
  /**
    Adds an observer on a property.

    This is the core method used to register an observer for a property.

    Once you call this method, any time the key's value is set, your observer
    will be notified. Note that the observers are triggered any time the
    value is set, regardless of whether it has actually changed. Your
    observer should be prepared to handle that.

    There are two common invocation patterns for `.addObserver()`:

    - Passing two arguments:
      - the name of the property to observe (as a string)
      - the function to invoke (an actual function)
    - Passing three arguments:
      - the name of the property to observe (as a string)
      - the target object (will be used to look up and invoke a
        function on)
      - the name of the function to invoke on the target object
        (as a string).

    ```app/components/my-component.js
    import Component from '@ember/component';

    export default Component.extend({
      init() {
        this._super(...arguments);

        // the following are equivalent:

        // using three arguments
        this.addObserver('foo', this, 'fooDidChange');

        // using two arguments
        this.addObserver('foo', (...args) => {
          this.fooDidChange(...args);
        });
      },

      fooDidChange() {
        // your custom logic code
      }
    });
    ```

    ### Observer Methods

    Observer methods have the following signature:

    ```app/components/my-component.js
    import Component from '@ember/component';

    export default Component.extend({
      init() {
        this._super(...arguments);
        this.addObserver('foo', this, 'fooDidChange');
      },

      fooDidChange(sender, key, value, rev) {
        // your code
      }
    });
    ```

    The `sender` is the object that changed. The `key` is the property that
    changes. The `value` property is currently reserved and unused. The `rev`
    is the last property revision of the object when it changed, which you can
    use to detect if the key value has really changed or not.

    Usually you will not need the value or revision parameters at
    the end. In this case, it is common to write observer methods that take
    only a sender and key value as parameters or, if you aren't interested in
    any of these values, to write an observer that has no parameters at all.

    @method addObserver
    @param {String} key The key to observe
    @param {Object} target The target object to invoke
    @param {String|Function} method The method to invoke
    @param {Boolean} sync Whether the observer is sync or not
    @return {Observable}
    @public
  */
  addObserver<Target extends object | Function | null>(
    key: keyof this & string,
    target: Target,
    method: ObserverMethod<Target, this>
  ): this;
  addObserver(key: keyof this & string, method: ObserverMethod<this, this>): this;
  addObserver<Target extends object | Function | null>(
    key: string,
    target: Target,
    method?: ObserverMethod<Target, this>,
    sync?: boolean
  ) {
    addObserver(this, key, target, method, sync);
    return this;
  }

  /**
    Remove an observer you have previously registered on this object. Pass
    the same key, target, and method you passed to `addObserver()` and your
    target will no longer receive notifications.

    @method removeObserver
    @param {String} key The key to observe
    @param {Object} target The target object to invoke
    @param {String|Function} method The method to invoke
    @param {Boolean} sync Whether the observer is async or not
    @return {Observable}
    @public
   */
  removeObserver<Target extends object | Function | null>(
    key: keyof this & string,
    target: Target,
    method: ObserverMethod<Target, this>
  ): this;
  removeObserver(key: keyof this & string, method: ObserverMethod<this, this>): this;
  removeObserver<Target extends object | Function | null>(
    key: string,
    target: Target,
    method?: string | Function,
    sync?: boolean
  ) {
    removeObserver(this, key, target, method, sync);
    return this;
  }

  /**
    Returns `true` if the object currently has observers registered for a
    particular key. You can use this method to potentially defer performing
    an expensive action until someone begins observing a particular property
    on the object.

    @method hasObserverFor
    @param {String} key Key to check
    @return {Boolean}
    @private
  */
  hasObserverFor(key: string) {
    return hasListeners(this, `${key}:change`);
  }

  // NOT TYPE SAFE!
  /**
    Set the value of a property to the current value plus some amount.

    ```javascript
    person.incrementProperty('age');
    team.incrementProperty('score', 2);
    ```

    @method incrementProperty
    @param {String} keyName The name of the property to increment
    @param {Number} increment The amount to increment by. Defaults to 1
    @return {Number} The new property value
    @public
  */
  incrementProperty(keyName: keyof this & string, increment = 1): number {
    assert(
      'Must pass a numeric value to incrementProperty',
      !isNaN(parseFloat(String(increment))) && isFinite(increment)
    );
    return set(this, keyName, (parseFloat(get(this, keyName) as string) || 0) + increment);
  }
  // NOT TYPE SAFE!
  /**
    Set the value of a property to the current value minus some amount.

    ```javascript
    player.decrementProperty('lives');
    orc.decrementProperty('health', 5);
    ```

    @method decrementProperty
    @param {String} keyName The name of the property to decrement
    @param {Number} decrement The amount to decrement by. Defaults to 1
    @return {Number} The new property value
    @public
  */
  decrementProperty(keyName: keyof this & string, decrement = 1): number {
    assert(
      'Must pass a numeric value to decrementProperty',
      (typeof decrement === 'number' || !isNaN(parseFloat(decrement))) && isFinite(decrement)
    );
    return set(this, keyName, ((get(this, keyName) as number) || 0) - decrement);
  }
  // NOT TYPE SAFE!
  /**
    Set the value of a boolean property to the opposite of its
    current value.

    ```javascript
    starship.toggleProperty('warpDriveEngaged');
    ```

    @method toggleProperty
    @param {String} keyName The name of the property to toggle
    @return {Boolean} The new property value
    @public
  */
  toggleProperty(keyName: keyof this & string): boolean {
    return set(this, keyName, !get(this, keyName));
  }
  /**
    Returns the cached value of a computed property, if it exists.
    This allows you to inspect the value of a computed property
    without accidentally invoking it if it is intended to be
    generated lazily.

    @method cacheFor
    @param {String} keyName
    @return {Object} The cached value of the computed property, if any
    @public
  */
  cacheFor(keyName: keyof this & string): unknown {
    let meta = peekMeta(this);
    return meta !== null ? meta.valueFor(keyName) : undefined;
  }

  get _debugContainerKey() {
    let factory = getFactoryFor(this);
    return factory !== undefined && factory.fullName;
  }
}

export default EmberObject;

/**
  Decorator that turns the target function into an Action which can be accessed
  directly by reference.

  ```js
  import Component from '@ember/component';
  import { tracked } from '@glimmer/tracking';
  import { action } from '@ember/object';

  export default class Tooltip extends Component {
    @tracked isShowing = false;

    @action
    toggleShowing() {
      this.isShowing = !this.isShowing;
    }
  }
  ```
  ```hbs
  <!-- template.hbs -->
  <button {{on "click" this.toggleShowing}}>Show tooltip</button>

  {{#if isShowing}}
    <div class="tooltip">
      I'm a tooltip!
    </div>
  {{/if}}
  ```

  It also binds the function directly to the instance, so it can be used in any
  context and will correctly refer to the class it came from:

  ```js
  import Component from '@ember/component';
  import { tracked } from '@glimmer/tracking';
  import { action } from '@ember/object';

  export default class Tooltip extends Component {
    constructor() {
      super(...arguments);

      // this.toggleShowing is still bound correctly when added to
      // the event listener
      document.addEventListener('click', this.toggleShowing);
    }

    @tracked isShowing = false;

    @action
    toggleShowing() {
      this.isShowing = !this.isShowing;
    }
  }
  ```

  @public
  @method action
  @for @ember/object
  @static
  @param {Function|undefined} callback The function to turn into an action,
                                       when used in classic classes
  @return {PropertyDecorator} property decorator instance
*/

const BINDINGS_MAP = new WeakMap();

interface HasProto {
  constructor: {
    proto(): void;
  };
}

function hasProto(obj: unknown): obj is HasProto {
  return (
    obj != null &&
    (obj as any).constructor !== undefined &&
    typeof ((obj as any).constructor as any).proto === 'function'
  );
}

interface HasActions {
  actions: Record<string | symbol, unknown>;
}

function setupAction(
  target: Partial<HasActions>,
  key: string | symbol,
  actionFn: Function
): TypedPropertyDescriptor<unknown> {
  if (hasProto(target)) {
    target.constructor.proto();
  }

  if (!Object.prototype.hasOwnProperty.call(target, 'actions')) {
    let parentActions = target.actions;
    // we need to assign because of the way mixins copy actions down when inheriting
    target.actions = parentActions ? Object.assign({}, parentActions) : {};
  }

  assert("[BUG] Somehow the target doesn't have actions!", target.actions != null);

  target.actions[key] = actionFn;

  return {
    get() {
      let bindings = BINDINGS_MAP.get(this);

      if (bindings === undefined) {
        bindings = new Map();
        BINDINGS_MAP.set(this, bindings);
      }

      let fn = bindings.get(actionFn);

      if (fn === undefined) {
        fn = actionFn.bind(this);
        bindings.set(actionFn, fn);
      }

      return fn;
    },
  };
}

export function action(
  target: ElementDescriptor[0],
  key: ElementDescriptor[1],
  desc: ElementDescriptor[2]
): PropertyDescriptor;
export function action(desc: PropertyDescriptor): ExtendedMethodDecorator;
export function action(
  ...args: ElementDescriptor | [PropertyDescriptor]
): PropertyDescriptor | ExtendedMethodDecorator {
  let actionFn: object | Function;

  if (!isElementDescriptor(args)) {
    actionFn = args[0];

    let decorator: ExtendedMethodDecorator = function (
      target,
      key,
      _desc,
      _meta,
      isClassicDecorator
    ) {
      assert(
        'The @action decorator may only be passed a method when used in classic classes. You should decorate methods directly in native classes',
        isClassicDecorator
      );

      assert(
        'The action() decorator must be passed a method when used in classic classes',
        typeof actionFn === 'function'
      );

      return setupAction(target, key, actionFn);
    };

    setClassicDecorator(decorator);

    return decorator;
  }

  let [target, key, desc] = args;

  actionFn = desc?.value;

  assert(
    'The @action decorator must be applied to methods when used in native classes',
    typeof actionFn === 'function'
  );

  // SAFETY: TS types are weird with decorators. This should work.
  return setupAction(target, key, actionFn);
}

// SAFETY: TS types are weird with decorators. This should work.
setClassicDecorator(action as ExtendedMethodDecorator);
