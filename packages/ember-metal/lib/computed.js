import { inspect } from 'ember-utils';
import { assert, warn, Error as EmberError } from 'ember-debug';
import { set } from './property_set';
import { meta as metaFor, peekMeta, UNDEFINED } from './meta';
import expandProperties from './expand_properties';
import {
  Descriptor,
  defineProperty
} from './properties';
import {
  propertyWillChange,
  propertyDidChange
} from './property_events';
import {
  addDependentKeys,
  removeDependentKeys
} from './dependent_keys';

/**
@module ember
@submodule ember-metal
*/

const DEEP_EACH_REGEX = /\.@each\.[^.]+\./;

/**
  A computed property transforms an object literal with object's accessor function(s) into a property.

  By default the function backing the computed property will only be called
  once and the result will be cached. You can specify various properties
  that your computed property depends on. This will force the cached
  result to be recomputed if the dependencies are modified.

  In the following example we declare a computed property - `fullName` - by calling
  `.Ember.computed()` with property dependencies (`firstName` and `lastName`) as leading arguments and getter accessor function. The `fullName` getter function
  will be called once (regardless of how many times it is accessed) as long
  as its dependencies have not changed. Once `firstName` or `lastName` are updated
  any future calls (or anything bound) to `fullName` will incorporate the new
  values.

  ```javascript
  let Person = Ember.Object.extend({
    // these will be supplied by `create`
    firstName: null,
    lastName: null,

    fullName: Ember.computed('firstName', 'lastName', function() {
      let firstName = this.get('firstName'),
          lastName  = this.get('lastName');

      return firstName + ' ' + lastName;
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
  let Person = Ember.Object.extend({
    // these will be supplied by `create`
    firstName: null,
    lastName: null,

    fullName: Ember.computed('firstName', 'lastName', {
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
  let Person = Ember.Object.extend({
    // these will be supplied by `create`
    firstName: null,
    lastName: null,

    fullName: Ember.computed('firstName', 'lastName', {
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
  @namespace Ember
  @public
*/
function ComputedProperty(config, opts) {
  this.isDescriptor = true;
  let hasGetterOnly = typeof config === 'function';
  if (hasGetterOnly) {
    this._getter = config;
  } else {
    assert('Ember.computed expects a function or an object as last argument.', typeof config === 'object' && !Array.isArray(config));
    assert('Config object passed to an Ember.computed can only contain `get` or `set` keys.', Object.keys(config).every((key)=> key === 'get' || key === 'set'));
    this._getter = config.get;
    this._setter = config.set;
  }
  assert('Computed properties must receive a getter or a setter, you passed none.', !!this._getter || !!this._setter);
  this._suspended = undefined;
  this._meta = undefined;
  this._volatile = false;

  this._dependentKeys = opts && opts.dependentKeys;
  this._readOnly = opts && hasGetterOnly && opts.readOnly === true;
}

ComputedProperty.prototype = new Descriptor();
ComputedProperty.prototype.constructor = ComputedProperty;

const ComputedPropertyPrototype = ComputedProperty.prototype;

/**
  Call on a computed property to set it into non-cached mode. When in this
  mode the computed property will not automatically cache the return value.

  It also does not automatically fire any change events. You must manually notify
  any changes if you want to observe this property.

  Dependency keys have no effect on volatile properties as they are for cache
  invalidation and notification when cached value is invalidated.

  ```javascript
  let outsideService = Ember.Object.extend({
    value: Ember.computed(function() {
      return OutsideService.getValue();
    }).volatile()
  }).create();
  ```

  @method volatile
  @return {Ember.ComputedProperty} this
  @chainable
  @public
*/
ComputedPropertyPrototype.volatile = function() {
  this._volatile = true;
  return this;
};

/**
  Call on a computed property to set it into read-only mode. When in this
  mode the computed property will throw an error when set.

  ```javascript
  let Person = Ember.Object.extend({
    guid: Ember.computed(function() {
      return 'guid-guid-guid';
    }).readOnly()
  });

  let person = Person.create();

  person.set('guid', 'new-guid'); // will throw an exception
  ```

  @method readOnly
  @return {Ember.ComputedProperty} this
  @chainable
  @public
*/
ComputedPropertyPrototype.readOnly = function() {
  this._readOnly = true;
  assert('Computed properties that define a setter using the new syntax cannot be read-only', !(this._readOnly && this._setter && this._setter !== this._getter));
  return this;
};

/**
  Sets the dependent keys on this computed property. Pass any number of
  arguments containing key paths that this computed property depends on.

  ```javascript
  let President = Ember.Object.extend({
    fullName: Ember.computed(function() {
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
  @param {String} path* zero or more property paths
  @return {Ember.ComputedProperty} this
  @chainable
  @public
*/
ComputedPropertyPrototype.property = function() {
  let args = [];

  function addArg(property) {
    warn(
      `Dependent keys containing @each only work one level deep. ` +
        `You used the key "${property}" which is invalid. ` +
          `Please create an intermediary computed property.`,
      DEEP_EACH_REGEX.test(property) === false,
      { id: 'ember-metal.computed-deep-each' }
    );
    args.push(property);
  }

  for (let i = 0; i < arguments.length; i++) {
    expandProperties(arguments[i], addArg);
  }

  this._dependentKeys = args;
  return this;
};

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
ComputedPropertyPrototype.meta = function(meta) {
  if (arguments.length === 0) {
    return this._meta || {};
  } else {
    this._meta = meta;
    return this;
  }
};

// invalidate cache when CP key changes
ComputedPropertyPrototype.didChange = function(obj, keyName) {
  // _suspended is set via a CP.set to ensure we don't clear
  // the cached value set by the setter
  if (this._volatile || this._suspended === obj) {
    return;
  }

  // don't create objects just to invalidate
  let meta = peekMeta(obj);
  if (meta === undefined || meta.source !== obj) {
    return;
  }

  let cache = meta.readableCache();
  if (cache !== undefined && cache[keyName] !== undefined) {
    cache[keyName] = undefined;
    removeDependentKeys(this, obj, keyName, meta);
  }
};

ComputedPropertyPrototype.get = function(obj, keyName) {
  if (this._volatile) {
    return this._getter.call(obj, keyName);
  }

  let meta = metaFor(obj);
  let cache = meta.writableCache();

  let result = cache[keyName];
  if (result === UNDEFINED) {
    return undefined;
  } else if (result !== undefined) {
    return result;
  }

  let ret = this._getter.call(obj, keyName);
  cache[keyName] = ret === undefined ? UNDEFINED : ret;

  let chainWatchers = meta.readableChainWatchers();
  if (chainWatchers !== undefined) {
    chainWatchers.revalidate(keyName);
  }
  addDependentKeys(this, obj, keyName, meta);

  return ret;
};

ComputedPropertyPrototype.set = function computedPropertySetEntry(obj, keyName, value) {
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
};

ComputedPropertyPrototype._throwReadOnlyError = function computedPropertyThrowReadOnlyError(obj, keyName) {
  throw new EmberError(`Cannot set read-only property "${keyName}" on object: ${inspect(obj)}`);
};

ComputedPropertyPrototype.clobberSet = function computedPropertyClobberSet(obj, keyName, value) {
  let cachedValue = cacheFor(obj, keyName);
  defineProperty(obj, keyName, null, cachedValue);
  set(obj, keyName, value);
  return value;
};

ComputedPropertyPrototype.volatileSet = function computedPropertyVolatileSet(obj, keyName, value) {
  return this._setter.call(obj, keyName, value);
};

ComputedPropertyPrototype.setWithSuspend = function computedPropertySetWithSuspend(obj, keyName, value) {
  let oldSuspended = this._suspended;
  this._suspended = obj;
  try {
    return this._set(obj, keyName, value);
  } finally {
    this._suspended = oldSuspended;
  }
};

ComputedPropertyPrototype._set = function computedPropertySet(obj, keyName, value) {
  let meta = metaFor(obj);
  let cache = meta.writableCache();
  let hadCachedValue = false;
  let cachedValue;
  let val = cache[keyName];
  if (val !== undefined) {
    if (val !== UNDEFINED) {
      cachedValue = val;
    }
    hadCachedValue = true;
  }

  let ret = this._setter.call(obj, keyName, value, cachedValue);

  // allows setter to return the same value that is cached already
  if (hadCachedValue && cachedValue === ret) {
    return ret;
  }

  propertyWillChange(obj, keyName, meta);

  if (hadCachedValue) {
    cache[keyName] = undefined;
  } else {
    addDependentKeys(this, obj, keyName, meta);
  }

  if (ret === undefined) {
    cache[keyName] = UNDEFINED;
  } else {
    cache[keyName] = ret;
  }

  propertyDidChange(obj, keyName, meta);

  return ret;
};

/* called before property is overridden */
ComputedPropertyPrototype.teardown = function(obj, keyName, meta) {
  if (this._volatile) {
    return;
  }
  let cache = meta.readableCache();
  if (cache !== undefined && cache[keyName] !== undefined) {
    removeDependentKeys(this, obj, keyName, meta);
    cache[keyName] = undefined;
  }
};

/**
  This helper returns a new property descriptor that wraps the passed
  computed property function. You can use this helper to define properties
  with mixins or via `Ember.defineProperty()`.

  If you pass a function as an argument, it will be used as a getter. A computed
  property defined in this way might look like this:

  ```js
  let Person = Ember.Object.extend({
    init() {
      this._super(...arguments);

      this.firstName = 'Betty';
      this.lastName = 'Jones';
    },

    fullName: Ember.computed('firstName', 'lastName', function() {
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
  let Person = Ember.Object.extend({
    init() {
      this._super(...arguments);

      this.firstName = 'Betty';
      this.lastName = 'Jones';
    },

    fullName: Ember.computed('firstName', 'lastName', {
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
  will have [prototype Extensions](https://emberjs.com/guides/configuring-ember/disabling-prototype-extensions/) enabled._

  The alternative syntax, with prototype extensions, might look like:

  ```js
  fullName: function() {
    return this.get('firstName') + ' ' + this.get('lastName');
  }.property('firstName', 'lastName')
  ```

  @class computed
  @namespace Ember
  @constructor
  @static
  @param {String} [dependentKeys*] Optional dependent keys that trigger this computed property.
  @param {Function} func The computed property function.
  @return {Ember.ComputedProperty} property descriptor instance
  @public
*/
export default function computed(...args) {
  let func = args.pop();

  let cp = new ComputedProperty(func);

  if (args.length > 0) {
    cp.property(...args);
  }

  return cp;
}

/**
  Returns the cached value for a property, if one exists.
  This can be useful for peeking at the value of a computed
  property that is generated lazily, without accidentally causing
  it to be created.

  @method cacheFor
  @for Ember
  @param {Object} obj the object whose property you want to check
  @param {String} key the name of the property whose cached value you want
    to return
  @return {Object} the cached value
  @public
*/
function cacheFor(obj, key) {
  let meta = peekMeta(obj);
  let cache = meta && meta.source === obj && meta.readableCache();
  let ret = cache && cache[key];

  if (ret === UNDEFINED) {
    return undefined;
  }
  return ret;
}

cacheFor.set = function(cache, key, value) {
  if (value === undefined) {
    cache[key] = UNDEFINED;
  } else {
    cache[key] = value;
  }
};

cacheFor.get = function(cache, key) {
  let ret = cache[key];
  if (ret === UNDEFINED) {
    return undefined;
  }
  return ret;
};

cacheFor.remove = function(cache, key) {
  cache[key] = undefined;
};

export {
  ComputedProperty,
  computed,
  cacheFor
};
