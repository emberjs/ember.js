import { assert } from '@ember/debug';
import { ENV } from '@ember/-internals/environment';
import type { ElementDescriptor, ExtendedMethodDecorator } from '@ember/-internals/metal';
import {
  isElementDescriptor,
  expandProperties,
  setClassicDecorator,
  hasListeners,
  beginPropertyChanges,
  notifyPropertyChange,
  endPropertyChanges,
  addObserver,
  removeObserver,
  get,
  set,
  getProperties,
  setProperties,
} from '@ember/-internals/metal';
import { getFactoryFor } from '@ember/-internals/container';
import { setObservers } from '@ember/-internals/utils';
import type { AnyFn } from '@ember/-internals/utility-types';
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
    Retrieves the value of a property from the object.

    This method is usually similar to using `object[keyName]` or `object.keyName`,
    however it supports both computed properties and the unknownProperty
    handler.

    Because `get` unifies the syntax for accessing all these kinds
    of properties, it can make many refactorings easier, such as replacing a
    simple property with a computed property, or vice versa.

    ### Computed Properties

    Computed properties are methods defined with the `property` modifier
    declared at the end, such as:

    ```javascript
    import { computed } from '@ember/object';

    fullName: computed('firstName', 'lastName', function() {
      return this.get('firstName') + ' ' + this.get('lastName');
    })
    ```

    When you call `get` on a computed property, the function will be
    called and the return value will be returned instead of the function
    itself.

    ### Unknown Properties

    Likewise, if you try to call `get` on a property whose value is
    `undefined`, the `unknownProperty()` method will be called on the object.
    If this method returns any value other than `undefined`, it will be returned
    instead. This allows you to implement "virtual" properties that are
    not defined upfront.

    @method get
    @param {String} keyName The property to retrieve
    @return {Object} The property value or undefined.
    @public
  */
  get<K extends keyof this>(key: K): this[K];
  get(key: string): unknown;
  get(keyName: string) {
    return get(this, keyName);
  }
  /**
    To get the values of multiple properties at once, call `getProperties`
    with a list of strings or an array:

    ```javascript
    record.getProperties('firstName', 'lastName', 'zipCode');
    // { firstName: 'John', lastName: 'Doe', zipCode: '10011' }
    ```

    is equivalent to:

    ```javascript
    record.getProperties(['firstName', 'lastName', 'zipCode']);
    // { firstName: 'John', lastName: 'Doe', zipCode: '10011' }
    ```

    @method getProperties
    @param {String...|Array} list of keys to get
    @return {Object}
    @public
  */
  getProperties<L extends Array<keyof this>>(list: L): { [Key in L[number]]: this[Key] };
  getProperties<L extends Array<keyof this>>(...list: L): { [Key in L[number]]: this[Key] };
  getProperties<L extends string[]>(list: L): { [Key in L[number]]: unknown };
  getProperties<L extends string[]>(...list: L): { [Key in L[number]]: unknown };
  getProperties(...args: string[]) {
    return getProperties(this, ...args);
  }
  // NOT TYPE SAFE!
  /**
    Sets the provided key or path to the value.

    ```javascript
    record.set("key", value);
    ```

    This method is generally very similar to calling `object["key"] = value` or
    `object.key = value`, except that it provides support for computed
    properties, the `setUnknownProperty()` method and property observers.

    ### Computed Properties

    If you try to set a value on a key that has a computed property handler
    defined (see the `get()` method for an example), then `set()` will call
    that method, passing both the value and key instead of simply changing
    the value itself. This is useful for those times when you need to
    implement a property that is composed of one or more member
    properties.

    ### Unknown Properties

    If you try to set a value on a key that is undefined in the target
    object, then the `setUnknownProperty()` handler will be called instead. This
    gives you an opportunity to implement complex "virtual" properties that
    are not predefined on the object. If `setUnknownProperty()` returns
    undefined, then `set()` will simply set the value on the object.

    ### Property Observers

    In addition to changing the property, `set()` will also register a property
    change with the object. Unless you have placed this call inside of a
    `beginPropertyChanges()` and `endPropertyChanges(),` any "local" observers
    (i.e. observer methods declared on the same object), will be called
    immediately. Any "remote" observers (i.e. observer methods declared on
    another object) will be placed in a queue and called at a later time in a
    coalesced manner.

    @method set
    @param {String} keyName The property to set
    @param {Object} value The value to set or `null`.
    @return {Object} The passed value
    @public
  */
  set<K extends keyof this, T extends this[K]>(key: K, value: T): T;
  set<T>(key: string, value: T): T;
  set(keyName: string, value: unknown) {
    return set(this, keyName, value);
  }
  // NOT TYPE SAFE!
  /**
    Sets a list of properties at once. These properties are set inside
    a single `beginPropertyChanges` and `endPropertyChanges` batch, so
    observers will be buffered.

    ```javascript
    record.setProperties({ firstName: 'Charles', lastName: 'Jolley' });
    ```

    @method setProperties
    @param {Object} hash the hash of keys and values to set
    @return {Object} The passed in hash
    @public
  */
  setProperties<K extends keyof this, P extends { [Key in K]: this[Key] }>(hash: P): P;
  setProperties<T extends Record<string, unknown>>(hash: T): T;
  setProperties(hash: object) {
    return setProperties(this, hash);
  }

  /**
    Begins a grouping of property changes.

    You can use this method to group property changes so that notifications
    will not be sent until the changes are finished. If you plan to make a
    large number of changes to an object at one time, you should call this
    method at the beginning of the changes to begin deferring change
    notifications. When you are done making changes, call
    `endPropertyChanges()` to deliver the deferred change notifications and end
    deferring.

    @method beginPropertyChanges
    @return {Observable}
    @private
  */
  beginPropertyChanges() {
    beginPropertyChanges();
    return this;
  }

  /**
    Ends a grouping of property changes.

    You can use this method to group property changes so that notifications
    will not be sent until the changes are finished. If you plan to make a
    large number of changes to an object at one time, you should call
    `beginPropertyChanges()` at the beginning of the changes to defer change
    notifications. When you are done making changes, call this method to
    deliver the deferred change notifications and end deferring.

    @method endPropertyChanges
    @return {Observable}
    @private
  */
  endPropertyChanges() {
    endPropertyChanges();
    return this;
  }
  /**
    Convenience method to call `propertyWillChange` and `propertyDidChange` in
    succession.

    Notify the observer system that a property has just changed.

    Sometimes you need to change a value directly or indirectly without
    actually calling `get()` or `set()` on it. In this case, you can use this
    method instead. Calling this method will notify all observers that the
    property has potentially changed value.

    @method notifyPropertyChange
    @param {String} keyName The property key to be notified about.
    @return {Observable}
    @public
  */
  notifyPropertyChange(keyName: string) {
    notifyPropertyChange(this, keyName);
    return this;
  }

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

// ..........................................................
// OBSERVER HELPER
//

type ObserverDefinition<T extends AnyFn> = {
  dependentKeys: string[];
  fn: T;
  sync: boolean;
};

/**
  Specify a method that observes property changes.

  ```javascript
  import EmberObject from '@ember/object';
  import { observer } from '@ember/object';

  export default EmberObject.extend({
    valueObserver: observer('value', function() {
      // Executes whenever the "value" property changes
    })
  });
  ```

  Also available as `Function.prototype.observes` if prototype extensions are
  enabled.

  @method observer
  @for @ember/object
  @param {String} propertyNames*
  @param {Function} func
  @return func
  @public
  @static
*/
export function observer<T extends AnyFn>(
  ...args:
    | [propertyName: string, ...additionalPropertyNames: string[], func: T]
    | [ObserverDefinition<T>]
): T {
  let funcOrDef = args.pop();

  assert(
    'observer must be provided a function or an observer definition',
    typeof funcOrDef === 'function' || (typeof funcOrDef === 'object' && funcOrDef !== null)
  );

  let func: T;
  let dependentKeys: string[];
  let sync: boolean;

  if (typeof funcOrDef === 'function') {
    func = funcOrDef;
    dependentKeys = args as string[];
    sync = !ENV._DEFAULT_ASYNC_OBSERVERS;
  } else {
    func = funcOrDef.fn;
    dependentKeys = funcOrDef.dependentKeys;
    sync = funcOrDef.sync;
  }

  assert('observer called without a function', typeof func === 'function');
  assert(
    'observer called without valid path',
    Array.isArray(dependentKeys) &&
      dependentKeys.length > 0 &&
      dependentKeys.every((p) => typeof p === 'string' && Boolean(p.length))
  );
  assert('observer called without sync', typeof sync === 'boolean');

  let paths: string[] = [];

  for (let dependentKey of dependentKeys) {
    expandProperties(dependentKey, (path: string) => paths.push(path));
  }

  setObservers(func as Function, {
    paths,
    sync,
  });
  return func;
}
