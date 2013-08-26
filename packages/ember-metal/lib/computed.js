require('ember-metal/core');
require('ember-metal/platform');
require('ember-metal/utils');
require('ember-metal/property_get');
require('ember-metal/property_set');
require('ember-metal/properties');
require('ember-metal/watching');
require('ember-metal/property_events');

/**
@module ember-metal
*/

Ember.warn("The CP_DEFAULT_CACHEABLE flag has been removed and computed properties are always cached by default. Use `volatile` if you don't want caching.", Ember.ENV.CP_DEFAULT_CACHEABLE !== false);


var get = Ember.get,
    set = Ember.set,
    metaFor = Ember.meta,
    a_slice = [].slice,
    o_create = Ember.create,
    META_KEY = Ember.META_KEY,
    watch = Ember.watch,
    unwatch = Ember.unwatch;

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
    watch(obj, depKey);
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
    unwatch(obj, depKey);
  }
}

// ..........................................................
// COMPUTED PROPERTY
//

/**
  @class ComputedProperty
  @namespace Ember
  @extends Ember.Descriptor
  @constructor
*/
function ComputedProperty(func, opts) {
  this.func = func;

  this._cacheable = (opts && opts.cacheable !== undefined) ? opts.cacheable : true;
  this._dependentKeys = opts && opts.dependentKeys;
  this._readOnly = opts && (opts.readOnly !== undefined || !!opts.readOnly);
}

Ember.ComputedProperty = ComputedProperty;
ComputedProperty.prototype = new Ember.Descriptor();

var ComputedPropertyPrototype = ComputedProperty.prototype;

/*
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
  MyApp.outsideService = Ember.Object.create({
    value: function() {
      return OutsideService.getValue();
    }.property().volatile()
  });
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
  MyApp.person = Ember.Object.create({
    guid: function() {
      return 'guid-guid-guid';
    }.property().readOnly()
  });

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
  MyApp.president = Ember.Object.create({
    fullName: Ember.computed(function() {
      return this.get('firstName') + ' ' + this.get('lastName');

      // Tell Ember that this computed property depends on firstName
      // and lastName
    }).property('firstName', 'lastName')
  });
  ```

  @method property
  @param {String} path* zero or more property paths
  @return {Ember.ComputedProperty} this
  @chainable
*/
ComputedPropertyPrototype.property = function() {
  var args = [];
  for (var i = 0, l = arguments.length; i < l; i++) {
    args.push(arguments[i]);
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
    if (keyName in meta.cache) {
      delete meta.cache[keyName];
      removeDependentKeys(this, obj, keyName, meta);
    }
  }
};

function finishChains(chainNodes)
{
  for (var i=0, l=chainNodes.length; i<l; i++) {
    chainNodes[i].didChange(true);
  }
}

/* impl descriptor API */
ComputedPropertyPrototype.get = function(obj, keyName) {
  var ret, cache, meta, chainNodes;
  if (this._cacheable) {
    meta = metaFor(obj);
    cache = meta.cache;
    if (keyName in cache) { return cache[keyName]; }
    ret = cache[keyName] = this.func.call(obj, keyName);
    chainNodes = meta.chainWatchers && meta.chainWatchers[keyName];
    if (chainNodes) { finishChains(chainNodes); }
    addDependentKeys(this, obj, keyName, meta);
  } else {
    ret = this.func.call(obj, keyName);
  }
  return ret;
};

/* impl descriptor API */
ComputedPropertyPrototype.set = function(obj, keyName, value) {
  var cacheable = this._cacheable,
      func = this.func,
      meta = metaFor(obj, cacheable),
      watched = meta.watching[keyName],
      oldSuspended = this._suspended,
      hadCachedValue = false,
      cache = meta.cache,
      funcArgLength, cachedValue, ret;

  if (this._readOnly) {
    throw new Error('Cannot Set: ' + keyName + ' on: ' + obj.toString() );
  }

  this._suspended = obj;

  try {

    if (cacheable && cache.hasOwnProperty(keyName)) {
      cachedValue = cache[keyName];
      hadCachedValue = true;
    }

    // Check if the CP has been wrapped. If if has, use the
    // length from the wrapped function.
    funcArgLength = (func.wrappedFunction ? func.wrappedFunction.length : func.length);

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
      Ember.defineProperty(obj, keyName, null, cachedValue);
      Ember.set(obj, keyName, value);
      return;
    }

    if (hadCachedValue && cachedValue === ret) { return; }

    if (watched) { Ember.propertyWillChange(obj, keyName); }

    if (hadCachedValue) {
      delete cache[keyName];
    }

    if (cacheable) {
      if (!hadCachedValue) {
        addDependentKeys(this, obj, keyName, meta);
      }
      cache[keyName] = ret;
    }

    if (watched) { Ember.propertyDidChange(obj, keyName); }
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
Ember.computed = function(func) {
  var args;

  if (arguments.length > 1) {
    args = a_slice.call(arguments, 0, -1);
    func = a_slice.call(arguments, -1)[0];
  }

  if (typeof func !== "function") {
    throw new Error("Computed Property declared without a property function");
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
  @return {*} the cached value
*/
Ember.cacheFor = function cacheFor(obj, key) {
  var cache = metaFor(obj, false).cache;

  if (cache && key in cache) {
    return cache[key];
  }
};

function getProperties(self, propertyNames) {
  var ret = {};
  for(var i = 0; i < propertyNames.length; i++) {
    ret[propertyNames[i]] = get(self, propertyNames[i]);
  }
  return ret;
}

function registerComputed(name, macro) {
  Ember.computed[name] = function(dependentKey) {
    var args = a_slice.call(arguments);
    return Ember.computed(dependentKey, function() {
      return macro.apply(this, args);
    });
  };
}

function registerComputedWithProperties(name, macro) {
  Ember.computed[name] = function() {
    var properties = a_slice.call(arguments);

    var computed = Ember.computed(function() {
      return macro.apply(this, [getProperties(this, properties)]);
    });

    return computed.property.apply(computed, properties);
  };
}

/**
  A computed property that returns true of the value of the dependent
  property is null, an empty string, empty array, or empty function.

  Note: When using `Ember.computed.empty` to watch an array make sure to
  use the `array.length` or `array.@each` syntax so the computed can
  subscribe to transitions from empty to non-empty states.

  Example

  ```javascript
  var ToDoList = Ember.Object.extend({
    done: Ember.computed.empty('todos.length')
  });
  var todoList = ToDoList.create({todoList: ['Unit Test', 'Documentation', 'Release']});
  todoList.get('done'); // false
  todoList.get('todoList').clear(); // []
  todoList.get('done'); // true
  ```

  @method computed.empty
  @for Ember
  @param {String} dependentKey
  @return {Ember.ComputedProperty} computed property which negate
  the original value for property
*/
registerComputed('empty', function(dependentKey) {
  return Ember.isEmpty(get(this, dependentKey));
});

/**
  A computed property that returns true of the value of the dependent
  property is NOT null, an empty string, empty array, or empty function.

  Example

  ```javascript
  var Hampster = Ember.Object.extend({
    hasStuff: Ember.computed.notEmpty('backpack')
  });
  var hampster = Hampster.create({backpack: ['Food', 'Sleeping Bag', 'Tent']});
  hampster.get('hasStuff'); // true
  hampster.get('backpack').clear(); // []
  hampster.get('hasStuff'); // false
  ```

  @method computed.notEmpty
  @for Ember
  @param {String} dependentKey
  @return {Ember.ComputedProperty} computed property which returns true if
  original value for property is not empty.
*/
registerComputed('notEmpty', function(dependentKey) {
  return !Ember.isEmpty(get(this, dependentKey));
});

/**
  A computed property that returns true of the value of the dependent
  property is null or undefined. This avoids errors from JSLint complaining
  about use of ==, which can be technically confusing.

  Example

  ```javascript
  var Hampster = Ember.Object.extend({
    isHungry: Ember.computed.none('food')
  });
  var hampster = Hampster.create();
  hampster.get('isHungry'); // true
  hampster.set('food', 'Banana');
  hampster.get('isHungry'); // false
  hampster.set('food', null);
  hampster.get('isHungry'); // true
  ```

  @method computed.none
  @for Ember
  @param {String} dependentKey
  @return {Ember.ComputedProperty} computed property which
  returns true if original value for property is null or undefined.
*/
registerComputed('none', function(dependentKey) {
  return Ember.isNone(get(this, dependentKey));
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
  user.get('isAnonymous'); // false
  user.set('loggedIn', true);
  user.get('isAnonymous'); // true
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
  var Hampster = Ember.Object.extend({
    hasBananas: Ember.computed.bool('numBananas')
  });
  var hampster = Hampster.create();
  hampster.get('hasBananas'); // false
  hampster.set('numBananas', 0);
  hampster.get('hasBananas'); // false
  hampster.set('numBananas', 1);
  hampster.get('hasBananas'); // true
  hampster.set('numBananas', null);
  hampster.get('hasBananas'); // false
  ```

  @method computed.bool
  @for Ember
  @param {String} dependentKey
  @return {Ember.ComputedProperty} computed property which convert
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
  user.set('email', 'ember_hampster@example.com');
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
  return typeof value === 'string' ? !!value.match(regexp) : false;
});

/**
  A computed property that returns true if the provided dependent property
  is equal to the given value.

  Example

  ```javascript
  var Hampster = Ember.Object.extend({
    napTime: Ember.computed.equal('state', 'sleepy')
  });
  var hampster = Hampster.create();
  hampster.get('napTime'); // false
  hampster.set('state', 'sleepy');
  hampster.get('napTime'); // false
  hampster.set('state', 'hungry');
  hampster.get('napTime'); // false
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
  var Hampster = Ember.Object.extend({
    hasTooManyBananas: Ember.computed.gt('numBananas', 10)
  });
  var hampster = Hampster.create();
  hampster.get('hasTooManyBananas'); // false
  hampster.set('numBananas', 3);
  hampster.get('hasTooManyBananas'); // false
  hampster.set('numBananas', 11);
  hampster.get('hasTooManyBananas'); // true
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
  var Hampster = Ember.Object.extend({
    hasTooManyBananas: Ember.computed.gte('numBananas', 10)
  });
  var hampster = Hampster.create();
  hampster.get('hasTooManyBananas'); // false
  hampster.set('numBananas', 3);
  hampster.get('hasTooManyBananas'); // false
  hampster.set('numBananas', 10);
  hampster.get('hasTooManyBananas'); // true
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
  var Hampster = Ember.Object.extend({
    needsMoreBananas: Ember.computed.lt('numBananas', 3)
  });
  var hampster = Hampster.create();
  hampster.get('needsMoreBananas'); // true
  hampster.set('numBananas', 3);
  hampster.get('needsMoreBananas'); // false
  hampster.set('numBananas', 2);
  hampster.get('needsMoreBananas'); // true
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
  var Hampster = Ember.Object.extend({
    needsMoreBananas: Ember.computed.lte('numBananas', 3)
  });
  var hampster = Hampster.create();
  hampster.get('needsMoreBananas'); // true
  hampster.set('numBananas', 5);
  hampster.get('needsMoreBananas'); // false
  hampster.set('numBananas', 3);
  hampster.get('needsMoreBananas'); // true
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
  var Hampster = Ember.Object.extend({
    readyForCamp: Ember.computed.and('hasTent', 'hasBackpack')
  });
  var hampster = Hampster.create();
  hampster.get('readyForCamp'); // false
  hampster.set('hasTent', true);
  hampster.get('readyForCamp'); // false
  hampster.set('hasBackpack', true);
  hampster.get('readyForCamp'); // true
  ```

  @method computed.and
  @for Ember
  @param {String} dependentKey, [dependentKey...]
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
  A computed property that which performs a logical `or` on the
  original values for the provided dependent properties.

  Example

  ```javascript
  var Hampster = Ember.Object.extend({
    readyForRain: Ember.computed.or('hasJacket', 'hasUmbrella')
  });
  var hampster = Hampster.create();
  hampster.get('readyForRain'); // false
  hampster.set('hasJacket', true);
  hampster.get('readyForRain'); // true
  ```

  @method computed.or
  @for Ember
  @param {String} dependentKey, [dependentKey...]
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
  var Hampster = Ember.Object.extend({
    hasClothes: Ember.computed.any('hat', 'shirt')
  });
  var hampster = Hampster.create();
  hampster.get('hasClothes'); // null
  hampster.set('shirt', 'Hawaiian Shirt');
  hampster.get('hasClothes'); // 'Hawaiian Shirt'
  ```

  @method computed.any
  @for Ember
  @param {String} dependentKey, [dependentKey...]
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
  var Hampster = Ember.Object.extend({
    clothes: Ember.computed.map('hat', 'shirt')
  });
  var hampster = Hampster.create();
  hampster.get('clothes'); // [null, null]
  hampster.set('hat', 'Camp Hat');
  hampster.set('shirt', 'Camp Shirt');
  hampster.get('clothes'); // ['Camp Hat', 'Camp Shirt']
  ```

  @method computed.map
  @for Ember
  @param {String} dependentKey, [dependentKey...]
  @return {Ember.ComputedProperty} computed property which maps
  values of all passed properties in to an array.
*/
registerComputedWithProperties('map', function(properties) {
  var res = [];
  for (var key in properties) {
    if (properties.hasOwnProperty(key)) {
      if (Ember.isNone(properties[key])) {
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
Ember.computed.alias = function(dependentKey) {
  return Ember.computed(dependentKey, function(key, value) {
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
  become the value set. This causes the downstream property to permentantly
  diverge from the upstream property.

  Example

  ```javascript
  User = Ember.Object.extend({
    firstName: null,
    lastName: null,
    nickName: Ember.computed.oneWay('firstName')
  });

  user = User.create({
    firstName: 'Teddy',
    lastName:  'Zeenny'
  });

  user.get('nickName');
  # 'Teddy'

  user.set('nickName', 'TeddyBear');
  # 'TeddyBear'

  user.get('firstName');
  # 'Teddy'
  ```

  @method computed.oneWay
  @for Ember
  @param {String} dependentKey
  @return {Ember.ComputedProperty} computed property which creates an
  one way computed property to the original value for property.
*/
Ember.computed.oneWay = function(dependentKey) {
  return Ember.computed(dependentKey, function() {
    return get(this, dependentKey);
  });
};


/**
  A computed property that acts like a standard getter and setter,
  but retruns the value at the provided `defaultPath` if the
  property itself has not been set to a value

  Example

  ```javascript
  var Hampster = Ember.Object.extend({
    wishList: Ember.computed.defaultTo('favoriteFood')
  });
  var hampster = Hampster.create({favoriteFood: 'Banana'});
  hampster.get('wishList'); // 'Banana'
  hampster.set('wishList', 'More Unit Tests');
  hampster.get('wishList'); // 'More Unit Tests'
  hampster.get('favoriteFood'); // 'Banana'
  ```

  @method computed.defaultTo
  @for Ember
  @param {String} defaultPath
  @return {Ember.ComputedProperty} computed property which acts like
  a standard getter and setter, but defaults to the value from `defaultPath`.
*/
Ember.computed.defaultTo = function(defaultPath) {
  return Ember.computed(function(key, newValue, cachedValue) {
    if (arguments.length === 1) {
      return cachedValue != null ? cachedValue : get(this, defaultPath);
    }
    return newValue != null ? newValue : get(this, defaultPath);
  });
};
