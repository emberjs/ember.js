import { meta as metaFor, peekMeta } from '@ember/-internals/meta';
import { inspect } from '@ember/-internals/utils';
import { EMBER_METAL_TRACKED_PROPERTIES } from '@ember/canary-features';
import { assert, warn } from '@ember/debug';
import EmberError from '@ember/error';
import {
  getCachedValueFor,
  getCacheFor,
  getLastRevisionFor,
  peekCacheFor,
  setLastRevisionFor,
} from './computed_cache';
import {
  addDependentKeys,
  DescriptorWithDependentKeys,
  removeDependentKeys,
} from './dependent_keys';
import expandProperties from './expand_properties';
import { defineProperty, Descriptor } from './properties';
import { notifyPropertyChange } from './property_events';
import { set } from './property_set';
import { tagForProperty, update } from './tags';
import { getCurrentTracker, setCurrentTracker } from './tracked';

import { buildComputedDesc, computedDecoratorWithParams,
  DECORATOR_COMPUTED_FN, DECORATOR_MODIFIERS, DECORATOR_PARAMS
} from './-private/decorator_utils';

export type ComputedPropertyGetter = (keyName: string) => any;
export type ComputedPropertySetter = (keyName: string, value: any) => any;

export interface ComputedPropertyGetterAndSetter {
  get?: ComputedPropertyGetter;
  set?: ComputedPropertySetter;
}
export type ComputedPropertyConfig = ComputedPropertyGetter | ComputedPropertyGetterAndSetter;

export interface ComputedPropertyOptions {
  dependentKeys?: string[];
  readOnly?: boolean;
}

// https://tc39.github.io/proposal-decorators/#sec-elementdescriptor-specification-type
interface ElementDescriptor {
  descriptor: PropertyDescriptor;
  initializer?: () => any; // unknown
  key: string;
  kind: 'method' | 'field' | 'initializer';
  placement: 'own' | 'prototype' | 'static';
}


/**
@module @ember/object
*/

const DEEP_EACH_REGEX = /\.@each\.[^.]+\./;

const BINDINGS_MAP = new WeakMap();


function noop(): void {}
/**
  A computed property transforms an object literal with object's accessor function(s) into a property.

  By default the function backing the computed property will only be called
  once and the result will be cached. You can specify various properties
  that your computed property depends on. This will force the cached
  result to be recomputed if the dependencies are modified.

  In the following example we declare a computed property - `fullName` - by calling
  `computed` with property dependencies (`firstName` and `lastName`) as leading arguments and getter accessor function. The `fullName` getter function
  will be called once (regardless of how many times it is accessed) as long
  as its dependencies have not changed. Once `firstName` or `lastName` are updated
  any future calls (or anything bound) to `fullName` will incorporate the new
  values.

  ```javascript
  import EmberObject, { computed } from '@ember/object';

  let Person = EmberObject.extend({
    // these will be supplied by `create`
    firstName: null,
    lastName: null,

    fullName: computed('firstName', 'lastName', function() {
      let firstName = this.get('firstName'),
          lastName  = this.get('lastName');

      return `${firstName} ${lastName}`;
    })
  });

  let tom = Person.create({
    firstName: 'Tom',
    lastName: 'Dale'
  });

  tom.get('fullName') // 'Tom Dale'
  ```

  You can also define what Ember should do when setting a computed property by providing additional function (`set`) in hash argument.
  If you try to set a computed property, it will try to invoke setter accessor function with the key and
  value you want to set it to as arguments.

  ```javascript
  import EmberObject, { computed } from '@ember/object';

  let Person = EmberObject.extend({
    // these will be supplied by `create`
    firstName: null,
    lastName: null,

    fullName: computed('firstName', 'lastName', {
      get(key) {
        let firstName = this.get('firstName'),
            lastName  = this.get('lastName');

        return firstName + ' ' + lastName;
      },
      set(key, value) {
        let [firstName, lastName] = value.split(' ');

        this.set('firstName', firstName);
        this.set('lastName', lastName);

        return value;
      }
    })
  });

  let person = Person.create();

  person.set('fullName', 'Peter Wagenet');
  person.get('firstName'); // 'Peter'
  person.get('lastName');  // 'Wagenet'
  ```

  You can overwrite computed property with normal property (no longer computed), that won't change if dependencies change, if you set computed property and it won't have setter accessor function defined.

  You can also mark computed property as `.readOnly()` and block all attempts to set it.

  ```javascript
  import EmberObject, { computed } from '@ember/object';

  let Person = EmberObject.extend({
    // these will be supplied by `create`
    firstName: null,
    lastName: null,

    fullName: computed('firstName', 'lastName', {
      get(key) {
        let firstName = this.get('firstName');
        let lastName  = this.get('lastName');

        return firstName + ' ' + lastName;
      }
    }).readOnly()
  });

  let person = Person.create();
  person.set('fullName', 'Peter Wagenet'); // Uncaught Error: Cannot set read-only property "fullName" on object: <(...):emberXXX>
  ```

  Additional resources:
  - [New CP syntax RFC](https://github.com/emberjs/rfcs/blob/master/text/0011-improved-cp-syntax.md)
  - [New computed syntax explained in "Ember 1.12 released" ](https://emberjs.com/blog/2015/05/13/ember-1-12-released.html#toc_new-computed-syntax)

  @class ComputedProperty
  @public
*/
export class ComputedProperty extends Descriptor implements DescriptorWithDependentKeys {
  private _meta: any | undefined;
  private _volatile: boolean;
  private _readOnly: boolean;
  private _suspended: any;
  _getter: ComputedPropertyGetter;
  _setter?: ComputedPropertySetter;
  _auto?: boolean;
  _dependentKeys: string[] | undefined;

  constructor(config: ComputedPropertyConfig, opts?: ComputedPropertyOptions) {
    super();
    let hasGetterOnly = typeof config === 'function';
    if (hasGetterOnly) {
      this._getter = config as ComputedPropertyGetter;
    } else {
      const objectConfig = config as ComputedPropertyGetterAndSetter;
      assert(
        'computed expects a function or an object as last argument.',
        typeof objectConfig === 'object' && !Array.isArray(objectConfig)
      );
      assert(
        'Config object passed to computed can only contain `get` and `set` keys.',
        Object.keys(objectConfig).every(key => key === 'get' || key === 'set')
      );
      assert(
        'Computed properties must receive a getter or a setter, you passed none.',
        Boolean(objectConfig.get) || Boolean(objectConfig.set)
      );
      this._getter = objectConfig.get || noop;
      this._setter = objectConfig.set;
    }

    this._suspended = undefined;
    this._meta = undefined;
    this._volatile = false;

    if (EMBER_METAL_TRACKED_PROPERTIES) {
      this._auto = false;
    }

    this._dependentKeys = opts && opts.dependentKeys;
    this._readOnly = Boolean(opts) && hasGetterOnly && opts!.readOnly === true;
  }

  /**
    Call on a computed property to set it into non-cached mode. When in this
    mode the computed property will not automatically cache the return value.
    It also does not automatically fire any change events. You must manually notify
    any changes if you want to observe this property.
    Dependency keys have no effect on volatile properties as they are for cache
    invalidation and notification when cached value is invalidated.
    ```javascript
    import EmberObject, { computed } from '@ember/object';
    let outsideService = EmberObject.extend({
      value: computed(function() {
        return OutsideService.getValue();
      }).volatile()
    }).create();
    ```
    @method volatile
    @return {ComputedProperty} this
    @chainable
    @public
  */
  volatile(): ComputedProperty {
    this._volatile = true;
    return this;
  }

  /**
    Call on a computed property to set it into read-only mode. When in this
    mode the computed property will throw an error when set.
    ```javascript
    import EmberObject, { computed } from '@ember/object';
    let Person = EmberObject.extend({
      guid: computed(function() {
        return 'guid-guid-guid';
      }).readOnly()
    });
    let person = Person.create();
    person.set('guid', 'new-guid'); // will throw an exception
    ```
    @method readOnly
    @return {ComputedProperty} this
    @chainable
    @public
  */
  readOnly(): ComputedProperty {
    this._readOnly = true;
    assert(
      'Computed properties that define a setter using the new syntax cannot be read-only',
      !(this._readOnly && this._setter && this._setter !== this._getter)
    );
    return this;
  }

  /**
    Sets the dependent keys on this computed property. Pass any number of
    arguments containing key paths that this computed property depends on.
    ```javascript
    import EmberObject, { computed } from '@ember/object';
    let President = EmberObject.extend({
      fullName: computed('firstName', 'lastName', function() {
        return this.get('firstName') + ' ' + this.get('lastName');
        // Tell Ember that this computed property depends on firstName
        // and lastName
      })
    });
    let president = President.create({
      firstName: 'Barack',
      lastName: 'Obama'
    });
    president.get('fullName'); // 'Barack Obama'
    ```
    @method property
    @param {String} path* zero or more property paths
    @return {ComputedProperty} this
    @chainable
    @public
  */
  property(...passedArgs: string[]): ComputedProperty {
    let args: string[] = [];

    function addArg(property: string): void {
      warn(
        `Dependent keys containing @each only work one level deep. ` +
          `You used the key "${property}" which is invalid. ` +
          `Please create an intermediary computed property.`,
        DEEP_EACH_REGEX.test(property) === false,
        { id: 'ember-metal.computed-deep-each' }
      );
      args.push(property);
    }

    for (let i = 0; i < passedArgs.length; i++) {
      expandProperties(passedArgs[i], addArg);
    }

    this._dependentKeys = args;
    return this;
  }

  /**
    In some cases, you may want to annotate computed properties with additional
    metadata about how they function or what values they operate on. For example,
    computed property functions may close over variables that are then no longer
    available for introspection.
    You can pass a hash of these values to a computed property like this:
    ```
    import { computed } from '@ember/object';
    import Person from 'my-app/utils/person';
    person: computed(function() {
      let personId = this.get('personId');
      return Person.create({ id: personId });
    }).meta({ type: Person })
    ```
    The hash that you pass to the `meta()` function will be saved on the
    computed property descriptor under the `_meta` key. Ember runtime
    exposes a public API for retrieving these values from classes,
    via the `metaForProperty()` function.
    @method meta
    @param {Object} meta
    @chainable
    @public
  */
  meta(meta?: any): any {
    if (arguments.length === 0) {
      return this._meta || {};
    } else {
      this._meta = meta;
      return this;
    }
  }

  // invalidate cache when CP key changes
  didChange(obj: object, keyName: string): void {
    // _suspended is set via a CP.set to ensure we don't clear
    // the cached value set by the setter
    if (this._volatile || this._suspended === obj) {
      return;
    }

    // don't create objects just to invalidate
    let meta = peekMeta(obj);
    if (meta === null || meta.source !== obj) {
      return;
    }

    let cache = peekCacheFor(obj);
    if (cache !== undefined && cache.delete(keyName)) {
      removeDependentKeys(this, obj, keyName, meta);
    }
  }

  get(obj: object, keyName: string): any {
    if (this._volatile) {
      return this._getter.call(obj, keyName);
    }

    let cache = getCacheFor(obj);
    let propertyTag;

    if (EMBER_METAL_TRACKED_PROPERTIES) {
      propertyTag = tagForProperty(obj, keyName);

      if (cache.has(keyName)) {
        // special-case for computed with no dependent keys used to
        // trigger cacheable behavior.
        if (!this._auto && (!this._dependentKeys || this._dependentKeys.length === 0)) {
          return cache.get(keyName);
        }

        let lastRevision = getLastRevisionFor(obj, keyName);
        if (propertyTag.validate(lastRevision)) {
          return cache.get(keyName);
        }
      }
    } else {
      if (cache.has(keyName)) {
        return cache.get(keyName);
      }
    }

    let parent: any;
    let tracker: any;

    if (EMBER_METAL_TRACKED_PROPERTIES) {
      parent = getCurrentTracker();
      tracker = setCurrentTracker();
    }

    let ret = this._getter.call(obj, keyName);

    if (EMBER_METAL_TRACKED_PROPERTIES) {
      setCurrentTracker(parent!);
      let tag = tracker!.combine();
      if (parent) parent.add(tag);

      update(propertyTag as any, tag);
      setLastRevisionFor(obj, keyName, (propertyTag as any).value());
    }

    cache.set(keyName, ret);

    let meta = metaFor(obj);
    let chainWatchers = meta.readableChainWatchers();
    if (chainWatchers !== undefined) {
      chainWatchers.revalidate(keyName);
    }
    addDependentKeys(this, obj, keyName, meta);

    return ret;
  }

  set(obj: object, keyName: string, value: any): any {
    if (this._readOnly) {
      this._throwReadOnlyError(obj, keyName);
    }

    if (!this._setter) {
      return this.clobberSet(obj, keyName, value);
    }

    if (this._volatile) {
      return this.volatileSet(obj, keyName, value);
    }

    return this.setWithSuspend(obj, keyName, value);
  }

  _throwReadOnlyError(obj: object, keyName: string): never {
    throw new EmberError(`Cannot set read-only property "${keyName}" on object: ${inspect(obj)}`);
  }

  clobberSet(obj: object, keyName: string, value: any): any {
    let cachedValue = getCachedValueFor(obj, keyName);
    defineProperty(obj, keyName, null, cachedValue);
    set(obj, keyName, value);
    return value;
  }

  volatileSet(obj: object, keyName: string, value: any): any {
    return this._setter!.call(obj, keyName, value);
  }

  setWithSuspend(obj: object, keyName: string, value: any): any {
    let oldSuspended = this._suspended;
    this._suspended = obj;
    try {
      return this._set(obj, keyName, value);
    } finally {
      this._suspended = oldSuspended;
    }
  }

  _set(obj: object, keyName: string, value: any): any {
    let cache = getCacheFor(obj);
    let hadCachedValue = cache.has(keyName);
    let cachedValue = cache.get(keyName);

    let ret = this._setter!.call(obj, keyName, value, cachedValue);

    // allows setter to return the same value that is cached already
    if (hadCachedValue && cachedValue === ret) {
      return ret;
    }

    let meta = metaFor(obj);
    if (!hadCachedValue) {
      addDependentKeys(this, obj, keyName, meta);
    }

    cache.set(keyName, ret);

    notifyPropertyChange(obj, keyName, meta);

    if (EMBER_METAL_TRACKED_PROPERTIES) {
      let propertyTag = tagForProperty(obj, keyName);
      setLastRevisionFor(obj, keyName, propertyTag.value());
    }

    return ret;
  }

  /* called before property is overridden */
  teardown(obj: object, keyName: string, meta?: any): void {
    if (!this._volatile) {
      let cache = peekCacheFor(obj);
      if (cache !== undefined && cache.delete(keyName)) {
        removeDependentKeys(this, obj, keyName, meta);
      }
    }
    super.teardown(obj, keyName, meta);
  }

  auto!: () => ComputedProperty;
}

if (EMBER_METAL_TRACKED_PROPERTIES) {
  ComputedProperty.prototype.auto = function(): ComputedProperty {
    this._auto = true;
    return this;
  };
}

export class DecoratorDescriptor extends ComputedProperty {
  setup(obj, key, meta) {

    if (!this._computedDesc) {
      this._computedDesc = buildComputedDesc(this, { key });
    }

    // if (gte('3.6.0')) {
      this._computedDesc.setup(obj, key, meta);
    // } else if (gte('3.1.0')) {
    //   let meta = Ember.meta(obj);

    //   Object.defineProperty(obj, key, {
    //     configurable: true,
    //     enumerable: true,
    //     get() {
    //       return this._computedDesc.get(key);
    //     }
    //   });

    //   meta.writeDescriptors(key, this._computedDesc);
    // } else {
    //   Object.defineProperty(obj, key, {
    //     configurable: true,
    //     writable: true,
    //     enumerable: true,
    //     value: this._computedDesc
    //   });
    // }
  }

  _addModifier(modifier) {
    let modifiers = DECORATOR_MODIFIERS.get(this);

    if (modifiers === undefined) {
      modifiers = [];
      DECORATOR_MODIFIERS.set(this, modifiers);
    }

    modifiers.push(modifier);
  }

  get() {
    return this._innerComputed.get.apply(this, arguments);
  }

  set() {
    return this._innerComputed.get.apply(this, arguments);
  }

  readOnly() {
    this._addModifier('readOnly');
    return this;
  }

  volatile() {
    this._addModifier('volatile');
    return this;
  }

  property(...keys) {
    this._addModifier(['property', keys]);
    return this;
  }
}

/**
  This helper returns a new property descriptor that wraps the passed
  computed property function. You can use this helper to define properties
  with mixins or via `defineProperty()`.

  If you pass a function as an argument, it will be used as a getter. A computed
  property defined in this way might look like this:

  ```js
  import EmberObject, { computed } from '@ember/object';
import { DecoratorDescriptor } from '../../../../../tmp/funnel-input_base_path-gav85kkw.tmp/@ember/-internals/metal/lib/decorator_descriptor';

  let Person = EmberObject.extend({
    init() {
      this._super(...arguments);

      this.firstName = 'Betty';
      this.lastName = 'Jones';
    },

    fullName: computed('firstName', 'lastName', function() {
      return `${this.get('firstName')} ${this.get('lastName')}`;
    })
  });

  let client = Person.create();

  client.get('fullName'); // 'Betty Jones'

  client.set('lastName', 'Fuller');
  client.get('fullName'); // 'Betty Fuller'
  ```

  You can pass a hash with two functions, `get` and `set`, as an
  argument to provide both a getter and setter:

  ```js
  import EmberObject, { computed } from '@ember/object';

  let Person = EmberObject.extend({
    init() {
      this._super(...arguments);

      this.firstName = 'Betty';
      this.lastName = 'Jones';
    },

    fullName: computed('firstName', 'lastName', {
      get(key) {
        return `${this.get('firstName')} ${this.get('lastName')}`;
      },
      set(key, value) {
        let [firstName, lastName] = value.split(/\s+/);
        this.setProperties({ firstName, lastName });
        return value;
      }
    })
  });

  let client = Person.create();
  client.get('firstName'); // 'Betty'

  client.set('fullName', 'Carroll Fuller');
  client.get('firstName'); // 'Carroll'
  ```

  The `set` function should accept two parameters, `key` and `value`. The value
  returned from `set` will be the new value of the property.

  _Note: This is the preferred way to define computed properties when writing third-party
  libraries that depend on or use Ember, since there is no guarantee that the user
  will have [prototype Extensions](https://guides.emberjs.com/release/configuring-ember/disabling-prototype-extensions/) enabled._

  The alternative syntax, with prototype extensions, might look like:

  ```js
  fullName: function() {
    return this.get('firstName') + ' ' + this.get('lastName');
  }.property('firstName', 'lastName')
  ```

  @method computed
  @for @ember/object
  @static
  @param {String} [dependentKeys*] Optional dependent keys that trigger this computed property.
  @param {Function} func The computed property function.
  @return {ComputedProperty} property descriptor instance
  @public
*/
export function emberComputed(...args: (string | ComputedPropertyConfig)[]): ComputedProperty {
  let func = args.pop();

  let cp = new ComputedProperty(func as ComputedPropertyConfig);

  if (args.length > 0) {
    cp.property(...(args as string[]));
  }

  return cp;
}

/**
  Decorator that turns a native getter/setter into a computed property. Note
  that though they use getters and setters, you must still use the Ember `get`/
  `set` functions to get and set their values.

  ```js
  import Component from '@ember/component';
  import { computed } from '@ember-decorators/object';
import descriptor from '../../../../../tmp/funnel-input_base_path-gav85kkw.tmp/@ember/-internals/metal/lib/descriptor';

  export default class UserProfileComponent extends Component {
    first = 'Bruce';
    last = 'Wayne';

    @computed('first', 'last')
    get name() {
      return `${this.first} ${this.last}`; // => 'Bruce Wayne'
    }

    set name(value) {
      if (typeof value !== 'string' || !value.test(/^[a-z]+ [a-z]+$/i)) {
        throw new TypeError('Invalid name');
      }

      const [first, last] = value.split(' ');
      this.setProperties({ first, last });
    }
  }
  ```

  Can also be optionally passed a computed property descriptor (e.g. a function
  or an object with `get` and `set` functions on it):

  ```js
  let fullNameComputed = computed('firstName', 'lastName', {
    get() {
      return `${this.first} ${this.last}`; // => 'Diana Prince'
    },

    set(key, value) {
      if (typeof value !== 'string' || !value.test(/^[a-z]+ [a-z]+$/i)) {
        throw new TypeError('Invalid name');
      }

      const [first, last] = value.split(' ');
      this.setProperties({ first, last });

      return value;
    }
  })

  export default class UserProfileComponent extends Component {
    first = 'Diana';
    last = 'Prince';

    @fullNameComputed fullName;
  }
  ```

  @function
  @param {...string} propertyNames - List of property keys this computed is dependent on
  @return {ComputedProperty}
*/
export const computed = computedDecoratorWithParams(({ key, descriptor, initializer }: ElementDescriptor, params = []) => {
  assert(
    `@computed can only be used on accessors or fields, attempted to use it with ${key} but that was a method. Try converting it to a getter (e.g. \`get ${key}() {}\`)`,
    !(descriptor && typeof descriptor.value === 'function')
  );

  assert(
    `@computed can only be used on empty fields. ${key} has an initial value (e.g. \`${key} = someValue\`)`,
    !initializer
  );

  let lastArg = params[params.length - 1];
  let get, set;

  if (typeof lastArg === 'function') {
    params.pop();
    get = lastArg;
  }

  if (typeof lastArg === 'object' && lastArg !== null) {
    params.pop();
    get = lastArg.get;
    set = lastArg.set;
  }

  assert(
    `Attempted to apply a computed property that already has a getter/setter to a ${key}, but it is a method or an accessor. If you passed @computed a function or getter/setter (e.g. \`@computed({ get() { ... } })\`), then it must be applied to a field`,
    !(descriptor && (typeof get === 'function' || typeof 'set' === 'function') && (typeof descriptor.get === 'function' || typeof descriptor.get === 'function'))
  );

  let usedClassDescriptor = false;

  if (get === undefined && set === undefined) {
    usedClassDescriptor = true;

    get = descriptor.get;
    set = descriptor.set;
  }

  assert(
    `Attempted to use @computed on ${key}, but it did not have a getter or a setter. You must either pass a get a function or getter/setter to @computed directly (e.g. \`@computed({ get() { ... } })\`) or apply @computed directly to a getter/setter`,
    typeof get === 'function' || typeof 'set' === 'function'
  );

  if (descriptor !== undefined) {
    // Unset the getter and setter so the descriptor just has a plain value
    descriptor.get = undefined;
    descriptor.set = undefined;
  }

  let setter = set;

  if (usedClassDescriptor === true && typeof set === 'function') {
    // Because the setter was defined using class syntax, it cannot have the
    // same `set(key, value)` signature, and it may not return a value. We
    // convert the call internally to pass the value as the first parameter,
    // and check to see if the return value is undefined and if so call the
    // getter again to get the value explicitly.
    setter = function(key, value) {
      let ret = set.call(this, value);
      return typeof ret === 'undefined' ? get.call(this) : ret;
    };
  }

  return emberComputed(...params, { get, set: setter });
});

export const _globalsComputed = computed.bind(null);

export default computed;