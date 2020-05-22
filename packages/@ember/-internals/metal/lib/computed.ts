import { Meta, meta as metaFor } from '@ember/-internals/meta';
import { inspect, isEmberArray, toString } from '@ember/-internals/utils';
import { assert, deprecate, warn } from '@ember/debug';
import EmberError from '@ember/error';
import {
  combine,
  consumeTag,
  Tag,
  track,
  untrack,
  UpdatableTag,
  updateTag,
  validateTag,
  valueForTag,
} from '@glimmer/validator';
import { finishLazyChains, getChainTagsForKeys } from './chain-tags';
import {
  getCachedValueFor,
  getCacheFor,
  getLastRevisionFor,
  peekCacheFor,
  setLastRevisionFor,
} from './computed_cache';
import {
  ComputedDescriptor,
  Decorator,
  DecoratorPropertyDescriptor,
  isElementDescriptor,
  makeComputedDecorator,
} from './decorator';
import {
  descriptorForDecorator,
  descriptorForProperty,
  isClassicDecorator,
} from './descriptor_map';
import expandProperties from './expand_properties';
import { setObserverSuspended } from './observer';
import { defineProperty } from './properties';
import { beginPropertyChanges, endPropertyChanges, notifyPropertyChange } from './property_events';
import { set } from './property_set';
import { tagForProperty } from './tags';

export type ComputedPropertyGetter = (keyName: string) => any;
export type ComputedPropertySetter = (keyName: string, value: any, cachedValue?: any) => any;

export interface ComputedPropertyGetterAndSetter {
  get?: ComputedPropertyGetter;
  set?: ComputedPropertySetter;
}
export type ComputedPropertyConfig = ComputedPropertyGetter | ComputedPropertyGetterAndSetter;

/**
@module @ember/object
*/

const DEEP_EACH_REGEX = /\.@each\.[^.]+\./;

function noop(): void {}
/**
  `@computed` is a decorator that turns a JavaScript getter and setter into a
  computed property, which is a _cached, trackable value_. By default the getter
  will only be called once and the result will be cached. You can specify
  various properties that your computed property depends on. This will force the
  cached result to be cleared if the dependencies are modified, and lazily recomputed the next time something asks for it.

  In the following example we decorate a getter - `fullName` -  by calling
  `computed` with the property dependencies (`firstName` and `lastName`) as
  arguments. The `fullName` getter will be called once (regardless of how many
  times it is accessed) as long as its dependencies do not change. Once
  `firstName` or `lastName` are updated any future calls to `fullName` will
  incorporate the new values, and any watchers of the value such as templates
  will be updated:

  ```javascript
  import { computed, set } from '@ember/object';

  class Person {
    constructor(firstName, lastName) {
      set(this, 'firstName', firstName);
      set(this, 'lastName', lastName);
    }

    @computed('firstName', 'lastName')
    get fullName() {
      return `${this.firstName} ${this.lastName}`;
    }
  });

  let tom = new Person('Tom', 'Dale');

  tom.fullName; // 'Tom Dale'
  ```

  You can also provide a setter, which will be used when updating the computed
  property. Ember's `set` function must be used to update the property
  since it will also notify observers of the property:

  ```javascript
  import { computed, set } from '@ember/object';

  class Person {
    constructor(firstName, lastName) {
      set(this, 'firstName', firstName);
      set(this, 'lastName', lastName);
    }

    @computed('firstName', 'lastName')
    get fullName() {
      return `${this.firstName} ${this.lastName}`;
    }

    set fullName(value) {
      let [firstName, lastName] = value.split(' ');

      set(this, 'firstName', firstName);
      set(this, 'lastName', lastName);
    }
  });

  let person = new Person();

  set(person, 'fullName', 'Peter Wagenet');
  person.firstName; // 'Peter'
  person.lastName;  // 'Wagenet'
  ```

  You can also pass a getter function or object with `get` and `set` functions
  as the last argument to the computed decorator. This allows you to define
  computed property _macros_:

  ```js
  import { computed } from '@ember/object';

  function join(...keys) {
    return computed(...keys, function() {
      return keys.map(key => this[key]).join(' ');
    });
  }

  class Person {
    @join('firstName', 'lastName')
    fullName;
  }
  ```

  Note that when defined this way, getters and setters receive the _key_ of the
  property they are decorating as the first argument. Setters receive the value
  they are setting to as the second argument instead. Additionally, setters must
  _return_ the value that should be cached:

  ```javascript
  import { computed, set } from '@ember/object';

  function fullNameMacro(firstNameKey, lastNameKey) {
    return computed(firstNameKey, lastNameKey, {
      get() {
        return `${this[firstNameKey]} ${this[lastNameKey]}`;
      }

      set(key, value) {
        let [firstName, lastName] = value.split(' ');

        set(this, firstNameKey, firstName);
        set(this, lastNameKey, lastName);

        return value;
      }
    });
  }

  class Person {
    constructor(firstName, lastName) {
      set(this, 'firstName', firstName);
      set(this, 'lastName', lastName);
    }

    @fullNameMacro fullName;
  });

  let person = new Person();

  set(person, 'fullName', 'Peter Wagenet');
  person.firstName; // 'Peter'
  person.lastName;  // 'Wagenet'
  ```

  Computed properties can also be used in classic classes. To do this, we
  provide the getter and setter as the last argument like we would for a macro,
  and we assign it to a property on the class definition. This is an _anonymous_
  computed macro:

  ```javascript
  import EmberObject, { computed, set } from '@ember/object';

  let Person = EmberObject.extend({
    // these will be supplied by `create`
    firstName: null,
    lastName: null,

    fullName: computed('firstName', 'lastName', {
      get() {
        return `${this.firstName} ${this.lastName}`;
      }

      set(key, value) {
        let [firstName, lastName] = value.split(' ');

        set(this, 'firstName', firstName);
        set(this, 'lastName', lastName);

        return value;
      }
    })
  });

  let tom = Person.create({
    firstName: 'Tom',
    lastName: 'Dale'
  });

  tom.get('fullName') // 'Tom Dale'
  ```

  You can overwrite computed property without setters with a normal property (no
  longer computed) that won't change if dependencies change. You can also mark
  computed property as `.readOnly()` and block all attempts to set it.

  ```javascript
  import { computed, set } from '@ember/object';

  class Person {
    constructor(firstName, lastName) {
      set(this, 'firstName', firstName);
      set(this, 'lastName', lastName);
    }

    @computed('firstName', 'lastName').readOnly()
    get fullName() {
      return `${this.firstName} ${this.lastName}`;
    }
  });

  let person = new Person();
  person.set('fullName', 'Peter Wagenet'); // Uncaught Error: Cannot set read-only property "fullName" on object: <(...):emberXXX>
  ```

  Additional resources:
  - [Decorators RFC](https://github.com/emberjs/rfcs/blob/master/text/0408-decorators.md)
  - [New CP syntax RFC](https://github.com/emberjs/rfcs/blob/master/text/0011-improved-cp-syntax.md)
  - [New computed syntax explained in "Ember 1.12 released" ](https://emberjs.com/blog/2015/05/13/ember-1-12-released.html#toc_new-computed-syntax)

  @class ComputedProperty
  @public
*/
export class ComputedProperty extends ComputedDescriptor {
  private _volatile = false;
  private _readOnly = false;
  private _hasConfig = false;

  _getter?: ComputedPropertyGetter = undefined;
  _setter?: ComputedPropertySetter = undefined;
  _auto?: boolean;

  constructor(args: Array<string | ComputedPropertyConfig>) {
    super();

    let maybeConfig = args[args.length - 1];

    if (
      typeof maybeConfig === 'function' ||
      (maybeConfig !== null && typeof maybeConfig === 'object')
    ) {
      this._hasConfig = true;
      let config = args.pop();

      if (typeof config === 'function') {
        assert(
          `You attempted to pass a computed property instance to computed(). Computed property instances are decorator functions, and cannot be passed to computed() because they cannot be turned into decorators twice`,
          !isClassicDecorator(config)
        );

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
    }

    if (args.length > 0) {
      this._property(...(args as string[]));
    }
  }

  setup(obj: object, keyName: string, propertyDesc: DecoratorPropertyDescriptor, meta: Meta) {
    super.setup(obj, keyName, propertyDesc, meta);

    assert(
      `@computed can only be used on accessors or fields, attempted to use it with ${keyName} but that was a method. Try converting it to a getter (e.g. \`get ${keyName}() {}\`)`,
      !(propertyDesc && typeof propertyDesc.value === 'function')
    );

    assert(
      `@computed can only be used on empty fields. ${keyName} has an initial value (e.g. \`${keyName} = someValue\`)`,
      !propertyDesc || !propertyDesc.initializer
    );

    assert(
      `Attempted to apply a computed property that already has a getter/setter to a ${keyName}, but it is a method or an accessor. If you passed @computed a function or getter/setter (e.g. \`@computed({ get() { ... } })\`), then it must be applied to a field`,
      !(
        this._hasConfig &&
        propertyDesc &&
        (typeof propertyDesc.get === 'function' || typeof propertyDesc.set === 'function')
      )
    );

    if (this._hasConfig === false) {
      assert(
        `Attempted to use @computed on ${keyName}, but it did not have a getter or a setter. You must either pass a get a function or getter/setter to @computed directly (e.g. \`@computed({ get() { ... } })\`) or apply @computed directly to a getter/setter`,
        propertyDesc &&
          (typeof propertyDesc.get === 'function' || typeof propertyDesc.set === 'function')
      );

      let { get, set } = propertyDesc!;

      if (get !== undefined) {
        this._getter = get as ComputedPropertyGetter;
      }

      if (set !== undefined) {
        this._setter = function setterWrapper(_key, value) {
          let ret = set!.call(this, value);

          if (get !== undefined) {
            return typeof ret === 'undefined' ? get.call(this) : ret;
          }

          return ret;
        };
      }
    }
  }

  /**
    Call on a computed property to set it into non-cached mode. When in this
    mode the computed property will not automatically cache the return value.
    It also does not automatically fire any change events. You must manually notify
    any changes if you want to observe this property.

    Dependency keys have no effect on volatile properties as they are for cache
    invalidation and notification when cached value is invalidated.

    Example:

    ```javascript
    import { computed } from '@ember/object';

    class CallCounter {
      _calledCount = 0;

      @computed().volatile()
      get calledCount() {
        return this._calledCount++;
      }
    }
    ```

    Classic Class Example:

    ```javascript
    import EmberObject, { computed } from '@ember/object';

    let CallCounter = EmberObject.extend({
      _calledCount: 0,

      value: computed(function() {
        return this._calledCount++;
      }).volatile()
    });
    ```
    @method volatile
    @deprecated
    @return {ComputedProperty} this
    @chainable
    @public
  */
  volatile(): void {
    deprecate(
      'Setting a computed property as volatile has been deprecated. Instead, consider using a native getter with native class syntax.',
      false,
      {
        id: 'computed-property.volatile',
        until: '4.0.0',
        url: 'https://emberjs.com/deprecations/v3.x#toc_computed-property-volatile',
      }
    );

    this._volatile = true;
  }

  /**
    Call on a computed property to set it into read-only mode. When in this
    mode the computed property will throw an error when set.

    Example:

    ```javascript
    import { computed, set } from '@ember/object';

    class Person {
      @computed().readOnly()
      get guid() {
        return 'guid-guid-guid';
      }
    }

    let person = new Person();
    set(person, 'guid', 'new-guid'); // will throw an exception
    ```

    Classic Class Example:

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
  readOnly(): void {
    this._readOnly = true;
    assert(
      'Computed properties that define a setter using the new syntax cannot be read-only',
      !(this._readOnly && this._setter && this._setter !== this._getter)
    );
  }

  /**
    Sets the dependent keys on this computed property. Pass any number of
    arguments containing key paths that this computed property depends on.

    Example:

    ```javascript
    import EmberObject, { computed } from '@ember/object';

    class President {
      constructor(firstName, lastName) {
        set(this, 'firstName', firstName);
        set(this, 'lastName', lastName);
      }

      // Tell Ember that this computed property depends on firstName
      // and lastName
      @computed().property('firstName', 'lastName')
      get fullName() {
        return `${this.firstName} ${this.lastName}`;
      }
    }

    let president = new President('Barack', 'Obama');

    president.fullName; // 'Barack Obama'
    ```

    Classic Class Example:

    ```javascript
    import EmberObject, { computed } from '@ember/object';

    let President = EmberObject.extend({
      fullName: computed(function() {
        return this.get('firstName') + ' ' + this.get('lastName');

        // Tell Ember that this computed property depends on firstName
        // and lastName
      }).property('firstName', 'lastName')
    });

    let president = President.create({
      firstName: 'Barack',
      lastName: 'Obama'
    });

    president.get('fullName'); // 'Barack Obama'
    ```

    @method property
    @deprecated
    @param {String} path* zero or more property paths
    @return {ComputedProperty} this
    @chainable
    @public
  */
  property(...passedArgs: string[]): void {
    deprecate(
      'Setting dependency keys using the `.property()` modifier has been deprecated. Pass the dependency keys directly to computed as arguments instead. If you are using `.property()` on a computed property macro, consider refactoring your macro to receive additional dependent keys in its initial declaration.',
      false,
      {
        id: 'computed-property.property',
        until: '4.0.0',
        url: 'https://emberjs.com/deprecations/v3.x#toc_computed-property-property',
      }
    );

    this._property(...passedArgs);
  }

  _property(...passedArgs: string[]): void {
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
  }

  /**
    In some cases, you may want to annotate computed properties with additional
    metadata about how they function or what values they operate on. For example,
    computed property functions may close over variables that are then no longer
    available for introspection. You can pass a hash of these values to a
    computed property.

    Example:

    ```javascript
    import { computed } from '@ember/object';
    import Person from 'my-app/utils/person';

    class Store {
      @computed().meta({ type: Person })
      get person() {
        let personId = this.personId;
        return Person.create({ id: personId });
      }
    }
    ```

    Classic Class Example:

    ```javascript
    import { computed } from '@ember/object';
    import Person from 'my-app/utils/person';

    const Store = EmberObject.extend({
      person: computed(function() {
        let personId = this.get('personId');
        return Person.create({ id: personId });
      }).meta({ type: Person })
    });
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

  get(obj: object, keyName: string): any {
    if (this._volatile) {
      return this._getter!.call(obj, keyName);
    }

    let cache = getCacheFor(obj);
    let propertyTag = tagForProperty(obj, keyName) as UpdatableTag;

    let ret;

    if (cache.has(keyName) && validateTag(propertyTag, getLastRevisionFor(obj, keyName))) {
      ret = cache.get(keyName);
    } else {
      // For backwards compatibility, we only throw if the CP has any dependencies. CPs without dependencies
      // should be allowed, even after the object has been destroyed, which is why we check _dependentKeys.
      assert(
        `Attempted to access the computed ${obj}.${keyName} on a destroyed object, which is not allowed`,
        this._dependentKeys === undefined || !metaFor(obj).isMetaDestroyed()
      );

      let upstreamTag: Tag | undefined = undefined;

      if (this._auto === true) {
        upstreamTag = track(() => {
          ret = this._getter!.call(obj, keyName);
        });
      } else {
        // Create a tracker that absorbs any trackable actions inside the CP
        untrack(() => {
          ret = this._getter!.call(obj, keyName);
        });
      }

      if (this._dependentKeys !== undefined) {
        let tag = combine(getChainTagsForKeys(obj, this._dependentKeys, true));

        upstreamTag = upstreamTag === undefined ? tag : combine([upstreamTag, tag]);
      }

      if (upstreamTag !== undefined) {
        updateTag(propertyTag!, upstreamTag);
      }

      setLastRevisionFor(obj, keyName, valueForTag(propertyTag));

      cache.set(keyName, ret);

      finishLazyChains(obj, keyName, ret);
    }

    consumeTag(propertyTag!);

    // Add the tag of the returned value if it is an array, since arrays
    // should always cause updates if they are consumed and then changed
    if (Array.isArray(ret) || isEmberArray(ret)) {
      consumeTag(tagForProperty(ret, '[]'));
    }

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

    let ret;

    try {
      beginPropertyChanges();

      ret = this._set(obj, keyName, value);

      finishLazyChains(obj, keyName, ret);

      let propertyTag = tagForProperty(obj, keyName) as UpdatableTag;

      if (this._dependentKeys !== undefined) {
        updateTag(propertyTag, combine(getChainTagsForKeys(obj, this._dependentKeys, true)));
      }

      setLastRevisionFor(obj, keyName, valueForTag(propertyTag));
    } finally {
      endPropertyChanges();
    }

    return ret;
  }

  _throwReadOnlyError(obj: object, keyName: string): never {
    throw new EmberError(`Cannot set read-only property "${keyName}" on object: ${inspect(obj)}`);
  }

  clobberSet(obj: object, keyName: string, value: any): any {
    deprecate(
      `The ${toString(
        obj
      )}#${keyName} computed property was just overridden. This removes the computed property and replaces it with a plain value, and has been deprecated. If you want this behavior, consider defining a setter which does it manually.`,
      false,
      {
        id: 'computed-property.override',
        until: '4.0.0',
        url: 'https://emberjs.com/deprecations/v3.x#toc_computed-property-override',
      }
    );

    let cachedValue = getCachedValueFor(obj, keyName);
    defineProperty(obj, keyName, null, cachedValue);
    set(obj, keyName, value);
    return value;
  }

  volatileSet(obj: object, keyName: string, value: any): any {
    return this._setter!.call(obj, keyName, value);
  }

  _set(obj: object, keyName: string, value: unknown): any {
    let cache = getCacheFor(obj);
    let hadCachedValue = cache.has(keyName);
    let cachedValue = cache.get(keyName);

    let ret;

    setObserverSuspended(obj, keyName, true);

    try {
      ret = this._setter!.call(obj, keyName, value, cachedValue);
    } finally {
      setObserverSuspended(obj, keyName, false);
    }

    // allows setter to return the same value that is cached already
    if (hadCachedValue && cachedValue === ret) {
      return ret;
    }

    let meta = metaFor(obj);

    cache.set(keyName, ret);

    notifyPropertyChange(obj, keyName, meta, value);

    return ret;
  }

  /* called before property is overridden */
  teardown(obj: object, keyName: string, meta?: any): void {
    if (!this._volatile) {
      let cache = peekCacheFor(obj);
      if (cache !== undefined) {
        cache.delete(keyName);
      }
    }
    super.teardown(obj, keyName, meta);
  }

  auto() {
    this._auto = true;
  }
}

export type ComputedDecorator = Decorator & PropertyDecorator & ComputedDecoratorImpl;

// TODO: This class can be svelted once `meta` has been deprecated
class ComputedDecoratorImpl extends Function {
  readOnly(this: Decorator) {
    (descriptorForDecorator(this) as ComputedProperty).readOnly();
    return this;
  }

  volatile(this: Decorator) {
    (descriptorForDecorator(this) as ComputedProperty).volatile();
    return this;
  }

  property(this: Decorator, ...keys: string[]) {
    (descriptorForDecorator(this) as ComputedProperty).property(...keys);
    return this;
  }

  meta(this: Decorator, meta?: any): any {
    let prop = descriptorForDecorator(this) as ComputedProperty;

    if (arguments.length === 0) {
      return prop._meta || {};
    } else {
      prop._meta = meta;
      return this;
    }
  }

  // TODO: Remove this when we can provide alternatives in the ecosystem to
  // addons such as ember-macro-helpers that use it.
  get _getter(this: Decorator) {
    return (descriptorForDecorator(this) as ComputedProperty)._getter;
  }

  // TODO: Refactor this, this is an internal API only
  set enumerable(this: Decorator, value: boolean) {
    (descriptorForDecorator(this) as ComputedProperty).enumerable = value;
  }
}

/**
  This helper returns a new property descriptor that wraps the passed
  computed property function. You can use this helper to define properties with
  native decorator syntax, mixins, or via `defineProperty()`.

  Example:

  ```js
  import { computed, set } from '@ember/object';

  class Person {
    constructor() {
      this.firstName = 'Betty';
      this.lastName = 'Jones';
    },

    @computed('firstName', 'lastName')
    get fullName() {
      return `${this.firstName} ${this.lastName}`;
    }
  }

  let client = new Person();

  client.fullName; // 'Betty Jones'

  set(client, 'lastName', 'Fuller');
  client.fullName; // 'Betty Fuller'
  ```

  Classic Class Example:

  ```js
  import EmberObject, { computed } from '@ember/object';

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

  You can also provide a setter, either directly on the class using native class
  syntax, or by passing a hash with `get` and `set` functions.

  Example:

  ```js
  import { computed, set } from '@ember/object';

  class Person {
    constructor() {
      this.firstName = 'Betty';
      this.lastName = 'Jones';
    },

    @computed('firstName', 'lastName')
    get fullName() {
      return `${this.firstName} ${this.lastName}`;
    }

    set fullName(value) {
      let [firstName, lastName] = value.split(/\s+/);

      set(this, 'firstName', firstName);
      set(this, 'lastName', lastName);

      return value;
    }
  }

  let client = new Person();

  client.fullName; // 'Betty Jones'

  set(client, 'lastName', 'Fuller');
  client.fullName; // 'Betty Fuller'
  ```

  Classic Class Example:

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

  When passed as an argument, the `set` function should accept two parameters,
  `key` and `value`. The value returned from `set` will be the new value of the
  property.

  _Note: This is the preferred way to define computed properties when writing third-party
  libraries that depend on or use Ember, since there is no guarantee that the user
  will have [prototype Extensions](https://guides.emberjs.com/release/configuring-ember/disabling-prototype-extensions/) enabled._

  The alternative syntax, with prototype extensions, might look like:

  ```js
  fullName: function() {
    return this.get('firstName') + ' ' + this.get('lastName');
  }.property('firstName', 'lastName')
  ```

  This form does not work with native decorators.

  @method computed
  @for @ember/object
  @static
  @param {String} [dependentKeys*] Optional dependent keys that trigger this computed property.
  @param {Function} func The computed property function.
  @return {ComputedDecorator} property decorator instance
  @public
*/
export function computed(target: object, key: string, desc: PropertyDescriptor): PropertyDescriptor;
export function computed(...args: (string | ComputedPropertyConfig)[]): ComputedDecorator;
export function computed(
  ...args: (object | string | ComputedPropertyConfig | DecoratorPropertyDescriptor)[]
): ComputedDecorator | DecoratorPropertyDescriptor {
  assert(
    `@computed can only be used directly as a native decorator. If you're using tracked in classic classes, add parenthesis to call it like a function: computed()`,
    !(isElementDescriptor(args.slice(0, 3)) && args.length === 5 && args[4] === true)
  );

  if (isElementDescriptor(args)) {
    let decorator = makeComputedDecorator(
      new ComputedProperty([]),
      ComputedDecoratorImpl
    ) as ComputedDecorator;

    return decorator(args[0], args[1], args[2]);
  }

  return makeComputedDecorator(
    new ComputedProperty(args as (string | ComputedPropertyConfig)[]),
    ComputedDecoratorImpl
  ) as ComputedDecorator;
}

/**
  Allows checking if a given property on an object is a computed property. For the most part,
  this doesn't matter (you would normally just access the property directly and use its value),
  but for some tooling specific scenarios (e.g. the ember-inspector) it is important to
  differentiate if a property is a computed property or a "normal" property.

  This will work on either a class's prototype or an instance itself.

  @static
  @method isComputed
  @for @ember/debug
  @private
 */
export function isComputed(obj: object, key: string): boolean {
  return Boolean(descriptorForProperty(obj, key));
}

export const _globalsComputed = computed.bind(null);

export default computed;
