import Ember from "ember-metal/core";
import {get} from "ember-metal/property_get";
import {set} from "ember-metal/property_set";
import {meta, META_KEY, guidFor, typeOf, inspect} from "ember-metal/utils";
import EnumerableUtils from "ember-metal/enumerable_utils";
import {create} from "ember-metal/platform";
import {watch, unwatch} from "ember-metal/watching";
import expandProperties from "ember-metal/expand_properties";
import EmberError from "ember-metal/error";
import {Descriptor, defineProperty} from "ember-metal/properties";
import {propertyWillChange, propertyDidChange} from "ember-metal/property_events";
import isEmpty from 'ember-metal/is_empty';
import {isNone} from 'ember-metal/is_none';

/**
@module ember-metal
*/

Ember.warn("The CP_DEFAULT_CACHEABLE flag has been removed and computed properties are always cached by default. Use `volatile` if you don't want caching.", Ember.ENV.CP_DEFAULT_CACHEABLE !== false);


var metaFor = meta,
    a_slice = [].slice,
    o_create = create;

function UNDEFINED() { }

if (Ember.FEATURES.isEnabled('ember-metal-computed-empty-array')) {
  var lengthPattern = /\.(length|\[\])$/;
}

// ..........................................................
// DEPENDENT KEYS
//

// data structure:
//  meta.deps = {
//   'depKey': {
//     'keyName': count,
//   }
//  }

/*
  This function returns a map of unique dependencies for a
  given object and key.
*/
function keysForDep(depsMeta, depKey) {
  var keys = depsMeta[depKey];
  if (!keys) {
    // if there are no dependencies yet for a the given key
    // create a new empty list of dependencies for the key
    keys = depsMeta[depKey] = {};
  } else if (!depsMeta.hasOwnProperty(depKey)) {
    // otherwise if the dependency list is inherited from
    // a superclass, clone the hash
    keys = depsMeta[depKey] = o_create(keys);
  }
  return keys;
}

function metaForDeps(meta) {
  return keysForDep(meta, 'deps');
}

function addDependentKeys(desc, obj, keyName, meta) {
  // the descriptor has a list of dependent keys, so
  // add all of its dependent keys.
  var depKeys = desc._dependentKeys, depsMeta, idx, len, depKey, keys;
  if (!depKeys) return;

  depsMeta = metaForDeps(meta);

  for(idx = 0, len = depKeys.length; idx < len; idx++) {
    depKey = depKeys[idx];
    // Lookup keys meta for depKey
    keys = keysForDep(depsMeta, depKey);
    // Increment the number of times depKey depends on keyName.
    keys[keyName] = (keys[keyName] || 0) + 1;
    // Watch the depKey
    watch(obj, depKey, meta);
  }
}

function removeDependentKeys(desc, obj, keyName, meta) {
  // the descriptor has a list of dependent keys, so
  // add all of its dependent keys.
  var depKeys = desc._dependentKeys, depsMeta, idx, len, depKey, keys;
  if (!depKeys) return;

  depsMeta = metaForDeps(meta);

  for(idx = 0, len = depKeys.length; idx < len; idx++) {
    depKey = depKeys[idx];
    // Lookup keys meta for depKey
    keys = keysForDep(depsMeta, depKey);
    // Increment the number of times depKey depends on keyName.
    keys[keyName] = (keys[keyName] || 0) - 1;
    // Watch the depKey
    unwatch(obj, depKey, meta);
  }
}

// ..........................................................
// COMPUTED PROPERTY
//

/**
  A computed property transforms an objects function into a property.

  By default the function backing the computed property will only be called
  once and the result will be cached. You can specify various properties
  that your computed property is dependent on. This will force the cached
  result to be recomputed if the dependencies are modified.

  In the following example we declare a computed property (by calling
  `.property()` on the fullName function) and setup the properties
  dependencies (depending on firstName and lastName). The fullName function
  will be called once (regardless of how many times it is accessed) as long
  as it's dependencies have not been changed. Once firstName or lastName are updated
  any future calls (or anything bound) to fullName will incorporate the new
  values.

  ```javascript
  Person = Ember.Object.extend({
    // these will be supplied by `create`
    firstName: null,
    lastName: null,

    fullName: function() {
      var firstName = this.get('firstName');
      var lastName = this.get('lastName');

     return firstName + ' ' + lastName;
    }.property('firstName', 'lastName')
  });

  var tom = Person.create({
    firstName: 'Tom',
    lastName: 'Dale'
  });

  tom.get('fullName') // 'Tom Dale'
  ```

  You can also define what Ember should do when setting a computed property.
  If you try to set a computed property, it will be invoked with the key and
  value you want to set it to. You can also accept the previous value as the
  third parameter.

  ```javascript

 Person = Ember.Object.extend({
    // these will be supplied by `create`
    firstName: null,
    lastName: null,

    fullName: function(key, value, oldValue) {
      // getter
      if (arguments.length === 1) {
        var firstName = this.get('firstName');
        var lastName = this.get('lastName');

        return firstName + ' ' + lastName;

      // setter
      } else {
        var name = value.split(" ");

        this.set('firstName', name[0]);
        this.set('lastName', name[1]);

        return value;
      }
    }.property('firstName', 'lastName')
  });

  var person = Person.create();
  person.set('fullName', 'Peter Wagenet');
  person.get('firstName') // 'Peter'
  person.get('lastName') // 'Wagenet'
  ```

  @class ComputedProperty
  @namespace Ember
  @extends Ember.Descriptor
  @constructor
*/
function ComputedProperty(func, opts) {
  func.__ember_arity__ = func.length;
  this.func = func;

  this._cacheable = (opts && opts.cacheable !== undefined) ? opts.cacheable : true;
  this._dependentKeys = opts && opts.dependentKeys;
  this._readOnly = opts && (opts.readOnly !== undefined || !!opts.readOnly) || false;
}

ComputedProperty.prototype = new Descriptor();

var ComputedPropertyPrototype = ComputedProperty.prototype;
ComputedPropertyPrototype._dependentKeys = undefined;
ComputedPropertyPrototype._suspended = undefined;
ComputedPropertyPrototype._meta = undefined;

/**
  Properties are cacheable by default. Computed property will automatically
  cache the return value of your function until one of the dependent keys changes.

  Call `volatile()` to set it into non-cached mode. When in this mode
  the computed property will not automatically cache the return value.

  However, if a property is properly observable, there is no reason to disable
  caching.

  @method cacheable
  @param {Boolean} aFlag optional set to `false` to disable caching
  @return {Ember.ComputedProperty} this
  @chainable
*/
ComputedPropertyPrototype.cacheable = function(aFlag) {
  this._cacheable = aFlag !== false;
  return this;
};

/**
  Call on a computed property to set it into non-cached mode. When in this
  mode the computed property will not automatically cache the return value.

  ```javascript
  MyApp.outsideService = Ember.Object.extend({
    value: function() {
      return OutsideService.getValue();
    }.property().volatile()
  }).create();
  ```

  @method volatile
  @return {Ember.ComputedProperty} this
  @chainable
*/
ComputedPropertyPrototype.volatile = function() {
  return this.cacheable(false);
};

/**
  Call on a computed property to set it into read-only mode. When in this
  mode the computed property will throw an error when set.

  ```javascript
  MyApp.Person = Ember.Object.extend({
    guid: function() {
      return 'guid-guid-guid';
    }.property().readOnly()
  });

  MyApp.person = MyApp.Person.create();

  MyApp.person.set('guid', 'new-guid'); // will throw an exception
  ```

  @method readOnly
  @return {Ember.ComputedProperty} this
  @chainable
*/
ComputedPropertyPrototype.readOnly = function(readOnly) {
  this._readOnly = readOnly === undefined || !!readOnly;
  return this;
};

/**
  Sets the dependent keys on this computed property. Pass any number of
  arguments containing key paths that this computed property depends on.

  ```javascript
  MyApp.President = Ember.Object.extend({
    fullName: computed(function() {
      return this.get('firstName') + ' ' + this.get('lastName');

      // Tell Ember that this computed property depends on firstName
      // and lastName
    }).property('firstName', 'lastName')
  });

  MyApp.president = MyApp.President.create({
    firstName: 'Barack',
    lastName: 'Obama',
  });

  MyApp.president.get('fullName'); // 'Barack Obama'
  ```

  @method property
  @param {String} path* zero or more property paths
  @return {Ember.ComputedProperty} this
  @chainable
*/
ComputedPropertyPrototype.property = function() {
  var args;

  var addArg = function (property) {
    args.push(property);
  };

  args = [];
  for (var i = 0, l = arguments.length; i < l; i++) {
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
  person: function() {
    var personId = this.get('personId');
    return App.Person.create({ id: personId });
  }.property().meta({ type: App.Person })
  ```

  The hash that you pass to the `meta()` function will be saved on the
  computed property descriptor under the `_meta` key. Ember runtime
  exposes a public API for retrieving these values from classes,
  via the `metaForProperty()` function.

  @method meta
  @param {Hash} meta
  @chainable
*/

ComputedPropertyPrototype.meta = function(meta) {
  if (arguments.length === 0) {
    return this._meta || {};
  } else {
    this._meta = meta;
    return this;
  }
};

/* impl descriptor API */
ComputedPropertyPrototype.didChange = function(obj, keyName) {
  // _suspended is set via a CP.set to ensure we don't clear
  // the cached value set by the setter
  if (this._cacheable && this._suspended !== obj) {
    var meta = metaFor(obj);
    if (meta.cache[keyName] !== undefined) {
      meta.cache[keyName] = undefined;
      removeDependentKeys(this, obj, keyName, meta);
    }
  }
};

function finishChains(chainNodes)
{
  for (var i=0, l=chainNodes.length; i<l; i++) {
    chainNodes[i].didChange(null);
  }
}

/**
  Access the value of the function backing the computed property.
  If this property has already been cached, return the cached result.
  Otherwise, call the function passing the property name as an argument.

  ```javascript
  Person = Ember.Object.extend({
    fullName: function(keyName) {
      // the keyName parameter is 'fullName' in this case.

      return this.get('firstName') + ' ' + this.get('lastName');
    }.property('firstName', 'lastName')
  });


  var tom = Person.create({
    firstName: 'Tom',
    lastName: 'Dale'
  });

  tom.get('fullName') // 'Tom Dale'
  ```

  @method get
  @param {String} keyName The key being accessed.
  @return {Object} The return value of the function backing the CP.
*/
ComputedPropertyPrototype.get = function(obj, keyName) {
  var ret, cache, meta, chainNodes;
  if (this._cacheable) {
    meta = metaFor(obj);
    cache = meta.cache;

    var result = cache[keyName];

    if (result === UNDEFINED) {
      return undefined;
    }  else if (result !== undefined) {
      return result;
    }

    ret = this.func.call(obj, keyName);
    if (ret === undefined) {
      cache[keyName] = UNDEFINED;
    } else {
      cache[keyName] = ret;
    }

    chainNodes = meta.chainWatchers && meta.chainWatchers[keyName];
    if (chainNodes) { finishChains(chainNodes); }
    addDependentKeys(this, obj, keyName, meta);
  } else {
    ret = this.func.call(obj, keyName);
  }
  return ret;
};

/**
  Set the value of a computed property. If the function that backs your
  computed property does not accept arguments then the default action for
  setting would be to define the property on the current object, and set
  the value of the property to the value being set.

  Generally speaking if you intend for your computed property to be set
  your backing function should accept either two or three arguments.

  @method set
  @param {String} keyName The key being accessed.
  @param {Object} newValue The new value being assigned.
  @param {String} oldValue The old value being replaced.
  @return {Object} The return value of the function backing the CP.
*/
ComputedPropertyPrototype.set = function(obj, keyName, value) {
  var cacheable = this._cacheable,
      func = this.func,
      meta = metaFor(obj, cacheable),
      oldSuspended = this._suspended,
      hadCachedValue = false,
      cache = meta.cache,
      funcArgLength, cachedValue, ret;

  if (this._readOnly) {
    throw new EmberError('Cannot set read-only property "' + keyName + '" on object: ' + inspect(obj));
  }

  this._suspended = obj;

  try {

    if (cacheable && cache[keyName] !== undefined) {
      cachedValue = cache[keyName];
      hadCachedValue = true;
    }

    // Check if the CP has been wrapped. If it has, use the
    // length from the wrapped function.

    funcArgLength = func.wrappedFunction ? func.wrappedFunction.__ember_arity__ : func.__ember_arity__;

    // For backwards-compatibility with computed properties
    // that check for arguments.length === 2 to determine if
    // they are being get or set, only pass the old cached
    // value if the computed property opts into a third
    // argument.
    if (funcArgLength === 3) {
      ret = func.call(obj, keyName, value, cachedValue);
    } else if (funcArgLength === 2) {
      ret = func.call(obj, keyName, value);
    } else {
      defineProperty(obj, keyName, null, cachedValue);
      set(obj, keyName, value);
      return;
    }

    if (hadCachedValue && cachedValue === ret) { return; }

    var watched = meta.watching[keyName];
    if (watched) { propertyWillChange(obj, keyName); }

    if (hadCachedValue) {
      cache[keyName] = undefined;
    }

    if (cacheable) {
      if (!hadCachedValue) {
        addDependentKeys(this, obj, keyName, meta);
      }
      if (ret === undefined) {
        cache[keyName] = UNDEFINED;
      } else {
        cache[keyName] = ret;
      }
    }

    if (watched) { propertyDidChange(obj, keyName); }
  } finally {
    this._suspended = oldSuspended;
  }
  return ret;
};

/* called before property is overridden */
ComputedPropertyPrototype.teardown = function(obj, keyName) {
  var meta = metaFor(obj);

  if (keyName in meta.cache) {
    removeDependentKeys(this, obj, keyName, meta);
  }

  if (this._cacheable) { delete meta.cache[keyName]; }

  return null; // no value to restore
};


/**
  This helper returns a new property descriptor that wraps the passed
  computed property function. You can use this helper to define properties
  with mixins or via `Ember.defineProperty()`.

  The function you pass will be used to both get and set property values.
  The function should accept two parameters, key and value. If value is not
  undefined you should set the value first. In either case return the
  current value of the property.

  @method computed
  @for Ember
  @param {Function} func The computed property function.
  @return {Ember.ComputedProperty} property descriptor instance
*/
function computed(func) {
  var args;

  if (arguments.length > 1) {
    args = a_slice.call(arguments, 0, -1);
    func = a_slice.call(arguments, -1)[0];
  }

  if (typeof func !== "function") {
    throw new EmberError("Computed Property declared without a property function");
  }

  var cp = new ComputedProperty(func);

  if (args) {
    cp.property.apply(cp, args);
  }

  return cp;
};

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
*/
function cacheFor(obj, key) {
  var meta = obj[META_KEY],
      cache = meta && meta.cache,
      ret = cache && cache[key];

  if (ret === UNDEFINED) { return undefined; }
  return ret;
};

cacheFor.set = function(cache, key, value) {
  if (value === undefined) {
    cache[key] = UNDEFINED;
  } else {
    cache[key] = value;
  }
};

cacheFor.get = function(cache, key) {
  var ret = cache[key];
  if (ret === UNDEFINED) { return undefined; }
  return ret;
};

cacheFor.remove = function(cache, key) {
  cache[key] = undefined;
};

function getProperties(self, propertyNames) {
  var ret = {};
  for(var i = 0; i < propertyNames.length; i++) {
    ret[propertyNames[i]] = get(self, propertyNames[i]);
  }
  return ret;
}

function registerComputed(name, macro) {
  computed[name] = function(dependentKey) {
    var args = a_slice.call(arguments);
    return computed(dependentKey, function() {
      return macro.apply(this, args);
    });
  };
};

function registerComputedWithProperties(name, macro) {
  computed[name] = function() {
    var properties = a_slice.call(arguments);

    var computedFunc = computed(function() {
      return macro.apply(this, [getProperties(this, properties)]);
    });

    return computedFunc.property.apply(computedFunc, properties);
  };
};

if (Ember.FEATURES.isEnabled('ember-metal-computed-empty-array')) {
  /**
    A computed property that returns true if the value of the dependent
    property is null, an empty string, empty array, or empty function.

    Example

    ```javascript
    var ToDoList = Ember.Object.extend({
      done: Ember.computed.empty('todos')
    });

    var todoList = ToDoList.create({todos: ['Unit Test', 'Documentation', 'Release']});

    todoList.get('done'); // false
    todoList.get('todos').clear();
    todoList.get('done'); // true
    ```

    @method computed.empty
    @for Ember
    @param {String} dependentKey
    @return {Ember.ComputedProperty} computed property which negate
    the original value for property
  */
  computed.empty = function (dependentKey) {
    return computed(dependentKey + '.length', function () {
      return isEmpty(get(this, dependentKey));
    });
  };
} else {
  /**
    A computed property that returns true if the value of the dependent
    property is null, an empty string, empty array, or empty function.

    Note: When using `computed.empty` to watch an array make sure to
    use the `array.[]` syntax so the computed can subscribe to transitions
    from empty to non-empty states.

    Example

    ```javascript
    var ToDoList = Ember.Object.extend({
      done: Ember.computed.empty('todos.[]') // detect array changes
    });

    var todoList = ToDoList.create({todos: ['Unit Test', 'Documentation', 'Release']});

    todoList.get('done'); // false
    todoList.get('todos').clear(); // []
    todoList.get('done'); // true
    ```

    @method computed.empty
    @for Ember
    @param {String} dependentKey
    @return {Ember.ComputedProperty} computed property which negate
    the original value for property
  */
  registerComputed('empty', function(dependentKey) {
    return isEmpty(get(this, dependentKey));
  });
}

/**
  A computed property that returns true if the value of the dependent
  property is NOT null, an empty string, empty array, or empty function.

  Note: When using `computed.notEmpty` to watch an array make sure to
  use the `array.[]` syntax so the computed can subscribe to transitions
  from empty to non-empty states.

  Example

  ```javascript
  var Hamster = Ember.Object.extend({
    hasStuff: Ember.computed.notEmpty('backpack.[]')
  });

  var hamster = Hamster.create({backpack: ['Food', 'Sleeping Bag', 'Tent']});

  hamster.get('hasStuff'); // true
  hamster.get('backpack').clear(); // []
  hamster.get('hasStuff'); // false
  ```

  @method computed.notEmpty
  @for Ember
  @param {String} dependentKey
  @return {Ember.ComputedProperty} computed property which returns true if
  original value for property is not empty.
*/
registerComputed('notEmpty', function(dependentKey) {
  return !isEmpty(get(this, dependentKey));
});

/**
  A computed property that returns true if the value of the dependent
  property is null or undefined. This avoids errors from JSLint complaining
  about use of ==, which can be technically confusing.

  Example

  ```javascript
  var Hamster = Ember.Object.extend({
    isHungry: Ember.computed.none('food')
  });

  var hamster = Hamster.create();

  hamster.get('isHungry'); // true
  hamster.set('food', 'Banana');
  hamster.get('isHungry'); // false
  hamster.set('food', null);
  hamster.get('isHungry'); // true
  ```

  @method computed.none
  @for Ember
  @param {String} dependentKey
  @return {Ember.ComputedProperty} computed property which
  returns true if original value for property is null or undefined.
*/
registerComputed('none', function(dependentKey) {
  return isNone(get(this, dependentKey));
});

/**
  A computed property that returns the inverse boolean value
  of the original value for the dependent property.

  Example

  ```javascript
  var User = Ember.Object.extend({
    isAnonymous: Ember.computed.not('loggedIn')
  });

  var user = User.create({loggedIn: false});

  user.get('isAnonymous'); // true
  user.set('loggedIn', true);
  user.get('isAnonymous'); // false
  ```

  @method computed.not
  @for Ember
  @param {String} dependentKey
  @return {Ember.ComputedProperty} computed property which returns
  inverse of the original value for property
*/
registerComputed('not', function(dependentKey) {
  return !get(this, dependentKey);
});

/**
  A computed property that converts the provided dependent property
  into a boolean value.

  ```javascript
  var Hamster = Ember.Object.extend({
    hasBananas: Ember.computed.bool('numBananas')
  });

  var hamster = Hamster.create();

  hamster.get('hasBananas'); // false
  hamster.set('numBananas', 0);
  hamster.get('hasBananas'); // false
  hamster.set('numBananas', 1);
  hamster.get('hasBananas'); // true
  hamster.set('numBananas', null);
  hamster.get('hasBananas'); // false
  ```

  @method computed.bool
  @for Ember
  @param {String} dependentKey
  @return {Ember.ComputedProperty} computed property which converts
  to boolean the original value for property
*/
registerComputed('bool', function(dependentKey) {
  return !!get(this, dependentKey);
});

/**
  A computed property which matches the original value for the
  dependent property against a given RegExp, returning `true`
  if they values matches the RegExp and `false` if it does not.

  Example

  ```javascript
  var User = Ember.Object.extend({
    hasValidEmail: Ember.computed.match('email', /^.+@.+\..+$/)
  });

  var user = User.create({loggedIn: false});

  user.get('hasValidEmail'); // false
  user.set('email', '');
  user.get('hasValidEmail'); // false
  user.set('email', 'ember_hamster@example.com');
  user.get('hasValidEmail'); // true
  ```

  @method computed.match
  @for Ember
  @param {String} dependentKey
  @param {RegExp} regexp
  @return {Ember.ComputedProperty} computed property which match
  the original value for property against a given RegExp
*/
registerComputed('match', function(dependentKey, regexp) {
  var value = get(this, dependentKey);
  return typeof value === 'string' ? regexp.test(value) : false;
});

/**
  A computed property that returns true if the provided dependent property
  is equal to the given value.

  Example

  ```javascript
  var Hamster = Ember.Object.extend({
    napTime: Ember.computed.equal('state', 'sleepy')
  });

  var hamster = Hamster.create();

  hamster.get('napTime'); // false
  hamster.set('state', 'sleepy');
  hamster.get('napTime'); // true
  hamster.set('state', 'hungry');
  hamster.get('napTime'); // false
  ```

  @method computed.equal
  @for Ember
  @param {String} dependentKey
  @param {String|Number|Object} value
  @return {Ember.ComputedProperty} computed property which returns true if
  the original value for property is equal to the given value.
*/
registerComputed('equal', function(dependentKey, value) {
  return get(this, dependentKey) === value;
});

/**
  A computed property that returns true if the provied dependent property
  is greater than the provided value.

  Example

  ```javascript
  var Hamster = Ember.Object.extend({
    hasTooManyBananas: Ember.computed.gt('numBananas', 10)
  });

  var hamster = Hamster.create();

  hamster.get('hasTooManyBananas'); // false
  hamster.set('numBananas', 3);
  hamster.get('hasTooManyBananas'); // false
  hamster.set('numBananas', 11);
  hamster.get('hasTooManyBananas'); // true
  ```

  @method computed.gt
  @for Ember
  @param {String} dependentKey
  @param {Number} value
  @return {Ember.ComputedProperty} computed property which returns true if
  the original value for property is greater then given value.
*/
registerComputed('gt', function(dependentKey, value) {
  return get(this, dependentKey) > value;
});

/**
  A computed property that returns true if the provided dependent property
  is greater than or equal to the provided value.

  Example

  ```javascript
  var Hamster = Ember.Object.extend({
    hasTooManyBananas: Ember.computed.gte('numBananas', 10)
  });

  var hamster = Hamster.create();

  hamster.get('hasTooManyBananas'); // false
  hamster.set('numBananas', 3);
  hamster.get('hasTooManyBananas'); // false
  hamster.set('numBananas', 10);
  hamster.get('hasTooManyBananas'); // true
  ```

  @method computed.gte
  @for Ember
  @param {String} dependentKey
  @param {Number} value
  @return {Ember.ComputedProperty} computed property which returns true if
  the original value for property is greater or equal then given value.
*/
registerComputed('gte', function(dependentKey, value) {
  return get(this, dependentKey) >= value;
});

/**
  A computed property that returns true if the provided dependent property
  is less than the provided value.

  Example

  ```javascript
  var Hamster = Ember.Object.extend({
    needsMoreBananas: Ember.computed.lt('numBananas', 3)
  });

  var hamster = Hamster.create();

  hamster.get('needsMoreBananas'); // true
  hamster.set('numBananas', 3);
  hamster.get('needsMoreBananas'); // false
  hamster.set('numBananas', 2);
  hamster.get('needsMoreBananas'); // true
  ```

  @method computed.lt
  @for Ember
  @param {String} dependentKey
  @param {Number} value
  @return {Ember.ComputedProperty} computed property which returns true if
  the original value for property is less then given value.
*/
registerComputed('lt', function(dependentKey, value) {
  return get(this, dependentKey) < value;
});

/**
  A computed property that returns true if the provided dependent property
  is less than or equal to the provided value.

  Example

  ```javascript
  var Hamster = Ember.Object.extend({
    needsMoreBananas: Ember.computed.lte('numBananas', 3)
  });

  var hamster = Hamster.create();

  hamster.get('needsMoreBananas'); // true
  hamster.set('numBananas', 5);
  hamster.get('needsMoreBananas'); // false
  hamster.set('numBananas', 3);
  hamster.get('needsMoreBananas'); // true
  ```

  @method computed.lte
  @for Ember
  @param {String} dependentKey
  @param {Number} value
  @return {Ember.ComputedProperty} computed property which returns true if
  the original value for property is less or equal then given value.
*/
registerComputed('lte', function(dependentKey, value) {
  return get(this, dependentKey) <= value;
});

/**
  A computed property that performs a logical `and` on the
  original values for the provided dependent properties.

  Example

  ```javascript
  var Hamster = Ember.Object.extend({
    readyForCamp: Ember.computed.and('hasTent', 'hasBackpack')
  });

  var hamster = Hamster.create();

  hamster.get('readyForCamp'); // false
  hamster.set('hasTent', true);
  hamster.get('readyForCamp'); // false
  hamster.set('hasBackpack', true);
  hamster.get('readyForCamp'); // true
  ```

  @method computed.and
  @for Ember
  @param {String} dependentKey*
  @return {Ember.ComputedProperty} computed property which performs
  a logical `and` on the values of all the original values for properties.
*/
registerComputedWithProperties('and', function(properties) {
  for (var key in properties) {
    if (properties.hasOwnProperty(key) && !properties[key]) {
      return false;
    }
  }
  return true;
});

/**
  A computed property which performs a logical `or` on the
  original values for the provided dependent properties.

  Example

  ```javascript
  var Hamster = Ember.Object.extend({
    readyForRain: Ember.computed.or('hasJacket', 'hasUmbrella')
  });

  var hamster = Hamster.create();

  hamster.get('readyForRain'); // false
  hamster.set('hasJacket', true);
  hamster.get('readyForRain'); // true
  ```

  @method computed.or
  @for Ember
  @param {String} dependentKey*
  @return {Ember.ComputedProperty} computed property which performs
  a logical `or` on the values of all the original values for properties.
*/
registerComputedWithProperties('or', function(properties) {
  for (var key in properties) {
    if (properties.hasOwnProperty(key) && properties[key]) {
      return true;
    }
  }
  return false;
});

/**
  A computed property that returns the first truthy value
  from a list of dependent properties.

  Example

  ```javascript
  var Hamster = Ember.Object.extend({
    hasClothes: Ember.computed.any('hat', 'shirt')
  });

  var hamster = Hamster.create();

  hamster.get('hasClothes'); // null
  hamster.set('shirt', 'Hawaiian Shirt');
  hamster.get('hasClothes'); // 'Hawaiian Shirt'
  ```

  @method computed.any
  @for Ember
  @param {String} dependentKey*
  @return {Ember.ComputedProperty} computed property which returns
  the first truthy value of given list of properties.
*/
registerComputedWithProperties('any', function(properties) {
  for (var key in properties) {
    if (properties.hasOwnProperty(key) && properties[key]) {
      return properties[key];
    }
  }
  return null;
});

/**
  A computed property that returns the array of values
  for the provided dependent properties.

  Example

  ```javascript
  var Hamster = Ember.Object.extend({
    clothes: Ember.computed.collect('hat', 'shirt')
  });

  var hamster = Hamster.create();

  hamster.get('clothes'); // [null, null]
  hamster.set('hat', 'Camp Hat');
  hamster.set('shirt', 'Camp Shirt');
  hamster.get('clothes'); // ['Camp Hat', 'Camp Shirt']
  ```

  @method computed.collect
  @for Ember
  @param {String} dependentKey*
  @return {Ember.ComputedProperty} computed property which maps
  values of all passed properties in to an array.
*/
registerComputedWithProperties('collect', function(properties) {
  var res = [];
  for (var key in properties) {
    if (properties.hasOwnProperty(key)) {
      if (isNone(properties[key])) {
        res.push(null);
      } else {
        res.push(properties[key]);
      }
    }
  }
  return res;
});

/**
  Creates a new property that is an alias for another property
  on an object. Calls to `get` or `set` this property behave as
  though they were called on the original property.

  ```javascript
  Person = Ember.Object.extend({
    name: 'Alex Matchneer',
    nomen: Ember.computed.alias('name')
  });

  alex = Person.create();

  alex.get('nomen'); // 'Alex Matchneer'
  alex.get('name');  // 'Alex Matchneer'

  alex.set('nomen', '@machty');
  alex.get('name');  // '@machty'
  ```

  @method computed.alias
  @for Ember
  @param {String} dependentKey
  @return {Ember.ComputedProperty} computed property which creates an
  alias to the original value for property.
*/
computed.alias = function(dependentKey) {
  return computed(dependentKey, function(key, value) {
    if (arguments.length > 1) {
      set(this, dependentKey, value);
      return value;
    } else {
      return get(this, dependentKey);
    }
  });
};

/**
  Where `computed.alias` aliases `get` and `set`, and allows for bidirectional
  data flow, `computed.oneWay` only provides an aliased `get`. The `set` will
  not mutate the upstream property, rather causes the current property to
  become the value set. This causes the downstream property to permanently
  diverge from the upstream property.

  Example

  ```javascript
  var User = Ember.Object.extend({
    firstName: null,
    lastName: null,
    nickName: Ember.computed.oneWay('firstName')
  });

  var teddy = User.create({
    firstName: 'Teddy',
    lastName:  'Zeenny'
  });

  teddy.get('nickName'); // 'Teddy'
  teddy.set('nickName', 'TeddyBear'); // 'TeddyBear'
  teddy.get('firstName'); // 'Teddy'
  ```

  @method computed.oneWay
  @for Ember
  @param {String} dependentKey
  @return {Ember.ComputedProperty} computed property which creates a
  one way computed property to the original value for property.
*/
computed.oneWay = function(dependentKey) {
  return computed(dependentKey, function() {
    return get(this, dependentKey);
  });
};

if (Ember.FEATURES.isEnabled('query-params-new')) {
  /**
    This is a more semantically meaningful alias of `computed.oneWay`,
    whose name is somewhat ambiguous as to which direction the data flows.

    @method computed.reads
    @for Ember
    @param {String} dependentKey
    @return {Ember.ComputedProperty} computed property which creates a
      one way computed property to the original value for property.
   */
  computed.reads = computed.oneWay;
}

/**
  Where `computed.oneWay` provides oneWay bindings, `computed.readOnly` provides
  a readOnly one way binding. Very often when using `computed.oneWay` one does
  not also want changes to propogate back up, as they will replace the value.

  This prevents the reverse flow, and also throws an exception when it occurs.

  Example

  ```javascript
  var User = Ember.Object.extend({
    firstName: null,
    lastName: null,
    nickName: Ember.computed.readOnly('firstName')
  });

  var teddy = User.create({
    firstName: 'Teddy',
    lastName:  'Zeenny'
  });

  teddy.get('nickName'); // 'Teddy'
  teddy.set('nickName', 'TeddyBear'); // throws Exception
  // throw new Ember.Error('Cannot Set: nickName on: <User:ember27288>' );`
  teddy.get('firstName'); // 'Teddy'
  ```

  @method computed.readOnly
  @for Ember
  @param {String} dependentKey
  @return {Ember.ComputedProperty} computed property which creates a
  one way computed property to the original value for property.
  @since 1.5.0
*/
computed.readOnly = function(dependentKey) {
  return computed(dependentKey, function() {
    return get(this, dependentKey);
  }).readOnly();
};
/**
  A computed property that acts like a standard getter and setter,
  but returns the value at the provided `defaultPath` if the
  property itself has not been set to a value

  Example

  ```javascript
  var Hamster = Ember.Object.extend({
    wishList: Ember.computed.defaultTo('favoriteFood')
  });

  var hamster = Hamster.create({favoriteFood: 'Banana'});

  hamster.get('wishList'); // 'Banana'
  hamster.set('wishList', 'More Unit Tests');
  hamster.get('wishList'); // 'More Unit Tests'
  hamster.get('favoriteFood'); // 'Banana'
  ```

  @method computed.defaultTo
  @for Ember
  @param {String} defaultPath
  @return {Ember.ComputedProperty} computed property which acts like
  a standard getter and setter, but defaults to the value from `defaultPath`.
*/
// ES6TODO: computed should have its own export path so you can do import {defaultTo} from computed
computed.defaultTo = function(defaultPath) {
  return computed(function(key, newValue, cachedValue) {
    if (arguments.length === 1) {
      return get(this, defaultPath);
    }
    return newValue != null ? newValue : get(this, defaultPath);
  });
};

export {ComputedProperty, computed, cacheFor};
