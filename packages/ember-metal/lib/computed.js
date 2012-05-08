// ==========================================================================
// Project:  Ember Metal
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-metal/core');
require('ember-metal/platform');
require('ember-metal/utils');
require('ember-metal/properties');


Ember.warn("Computed properties will soon be cacheable by default. To enable this in your app, set `ENV.CP_DEFAULT_CACHEABLE = true`.", Ember.CP_DEFAULT_CACHEABLE);


var meta = Ember.meta;
var guidFor = Ember.guidFor;
var USE_ACCESSORS = Ember.USE_ACCESSORS;
var a_slice = Array.prototype.slice;
var o_create = Ember.platform.create;
var o_defineProperty = Ember.platform.defineProperty;

// ..........................................................
// DEPENDENT KEYS
//

// data structure:
//  meta.deps = {
//   'depKey': {
//     'keyName': count,
//     __emberproto__: SRC_OBJ [to detect clones]
//     },
//   __emberproto__: SRC_OBJ
//  }

/** @private */
function uniqDeps(obj, depKey) {
  var m = meta(obj), deps, ret;
  deps = m.deps;
  if (!deps) {
    deps = m.deps = { __emberproto__: obj };
  } else if (deps.__emberproto__ !== obj) {
    deps = m.deps = o_create(deps);
    deps.__emberproto__ = obj;
  }

  ret = deps[depKey];
  if (!ret) {
    ret = deps[depKey] = { __emberproto__: obj };
  } else if (ret.__emberproto__ !== obj) {
    ret = deps[depKey] = o_create(ret);
    ret.__emberproto__ = obj;
  }

  return ret;
}

/** @private */
function addDependentKey(obj, keyName, depKey) {
  var deps = uniqDeps(obj, depKey);
  deps[keyName] = (deps[keyName] || 0) + 1;
  Ember.watch(obj, depKey);
}

/** @private */
function removeDependentKey(obj, keyName, depKey) {
  var deps = uniqDeps(obj, depKey);
  deps[keyName] = (deps[keyName] || 0) - 1;
  Ember.unwatch(obj, depKey);
}

/** @private */
function addDependentKeys(desc, obj, keyName) {
  var keys = desc._dependentKeys,
      len  = keys ? keys.length : 0;
  for(var idx=0;idx<len;idx++) addDependentKey(obj, keyName, keys[idx]);
}

// ..........................................................
// COMPUTED PROPERTY
//

/** @private */
function ComputedProperty(func, opts) {
  this.func = func;
  this._cacheable = (opts && opts.cacheable !== undefined) ? opts.cacheable : Ember.CP_DEFAULT_CACHEABLE;
  this._dependentKeys = opts && opts.dependentKeys;
}

/**
  @constructor
*/
Ember.ComputedProperty = ComputedProperty;
ComputedProperty.prototype = new Ember.Descriptor();

var CP_DESC = {
  configurable: true,
  enumerable:   true,
  get: function() { return undefined; }, // for when use_accessors is false.
  set: Ember.Descriptor.MUST_USE_SETTER  // for when use_accessors is false
};

/** @private */
function mkCpGetter(keyName, desc) {
  var cacheable = desc._cacheable,
      func     = desc.func;

  if (cacheable) {
    return function() {
      var ret, cache = meta(this).cache;
      if (keyName in cache) return cache[keyName];
      ret = cache[keyName] = func.call(this, keyName);
      return ret ;
    };
  } else {
    return function() {
      return func.call(this, keyName);
    };
  }
}

/** @private */
function mkCpSetter(keyName, desc) {
  var cacheable = desc._cacheable,
      func      = desc.func;

  return function(value) {
    var m = meta(this, cacheable),
        watched = (m.source===this) && m.watching[keyName]>0,
        ret, oldSuspended, lastSetValues;

    oldSuspended = desc._suspended;
    desc._suspended = this;

    watched = watched && m.lastSetValues[keyName]!==guidFor(value);
    if (watched) {
      m.lastSetValues[keyName] = guidFor(value);
      Ember.propertyWillChange(this, keyName);
    }

    if (cacheable) delete m.cache[keyName];
    ret = func.call(this, keyName, value);
    if (cacheable) m.cache[keyName] = ret;
    if (watched) Ember.propertyDidChange(this, keyName);
    desc._suspended = oldSuspended;
    return ret;
  };
}

/**
  @extends Ember.ComputedProperty
  @private
*/
var Cp = ComputedProperty.prototype;

/**
  Call on a computed property to set it into cacheable mode.  When in this
  mode the computed property will automatically cache the return value of
  your function until one of the dependent keys changes.

      MyApp.president = Ember.Object.create({
        fullName: function() {
          return this.get('firstName') + ' ' + this.get('lastName');

          // After calculating the value of this function, Ember.js will
          // return that value without re-executing this function until
          // one of the dependent properties change.
        }.property('firstName', 'lastName').cacheable()
      });

  Properties are cacheable by default.

  @name Ember.ComputedProperty.cacheable
  @param {Boolean} aFlag optional set to false to disable caching
  @returns {Ember.ComputedProperty} receiver
*/
Cp.cacheable = function(aFlag) {
  this._cacheable = aFlag!==false;
  return this;
};

/**
  Call on a computed property to set it into non-cached mode.  When in this
  mode the computed property will not automatically cache the return value.

      MyApp.outsideService = Ember.Object.create({
        value: function() {
          return OutsideService.getValue();
        }.property().volatile()
      });

  @name Ember.ComputedProperty.volatile
  @returns {Ember.ComputedProperty} receiver
*/
Cp.volatile = function() {
  return this.cacheable(false);
};

/**
  Sets the dependent keys on this computed property.  Pass any number of
  arguments containing key paths that this computed property depends on.

      MyApp.president = Ember.Object.create({
        fullName: Ember.computed(function() {
          return this.get('firstName') + ' ' + this.get('lastName');

          // Tell Ember.js that this computed property depends on firstName
          // and lastName
        }).property('firstName', 'lastName')
      });

  @name Ember.ComputedProperty.property
  @param {String} path... zero or more property paths
  @returns {Ember.ComputedProperty} receiver
*/
Cp.property = function() {
  this._dependentKeys = a_slice.call(arguments);
  return this;
};

/**
  In some cases, you may want to annotate computed properties with additional
  metadata about how they function or what values they operate on. For example,
  computed property functions may close over variables that are then no longer
  available for introspection.

  You can pass a hash of these values to a computed property like this:

      person: function() {
        var personId = this.get('personId');
        return App.Person.create({ id: personId });
      }.property().meta({ type: App.Person })

  The hash that you pass to the `meta()` function will be saved on the
  computed property descriptor under the `_meta` key. Ember runtime
  exposes a public API for retrieving these values from classes,
  via the `metaForProperty()` function.

  @name Ember.ComputedProperty.meta
  @param {Hash} metadata
  @returns {Ember.ComputedProperty} property descriptor instance
*/

Cp.meta = function(meta) {
  this._meta = meta;
  return this;
};

/** @private - impl descriptor API */
Cp.setup = function(obj, keyName, value) {
  CP_DESC.get = mkCpGetter(keyName, this);
  CP_DESC.set = mkCpSetter(keyName, this);
  o_defineProperty(obj, keyName, CP_DESC);
  CP_DESC.get = CP_DESC.set = null;
  addDependentKeys(this, obj, keyName);
};

/** @private - impl descriptor API */
Cp.teardown = function(obj, keyName) {
  var keys = this._dependentKeys,
      len  = keys ? keys.length : 0;
  for(var idx=0;idx<len;idx++) removeDependentKey(obj, keyName, keys[idx]);

  if (this._cacheable) delete meta(obj).cache[keyName];

  return null; // no value to restore
};

/** @private - impl descriptor API */
Cp.didChange = function(obj, keyName) {
  if (this._cacheable && (this._suspended !== obj)) {
    delete meta(obj).cache[keyName];
  }
};

/** @private - impl descriptor API */
Cp.get = function(obj, keyName) {
  var ret, cache;

  if (this._cacheable) {
    cache = meta(obj).cache;
    if (keyName in cache) return cache[keyName];
    ret = cache[keyName] = this.func.call(obj, keyName);
  } else {
    ret = this.func.call(obj, keyName);
  }
  return ret ;
};

/** @private - impl descriptor API */
Cp.set = function(obj, keyName, value) {
  var cacheable = this._cacheable;

  var m = meta(obj, cacheable),
      watched = (m.source===obj) && m.watching[keyName]>0,
      ret, oldSuspended, lastSetValues;

  oldSuspended = this._suspended;
  this._suspended = obj;

  watched = watched && m.lastSetValues[keyName]!==guidFor(value);
  if (watched) {
    m.lastSetValues[keyName] = guidFor(value);
    Ember.propertyWillChange(obj, keyName);
  }

  if (cacheable) delete m.cache[keyName];
  ret = this.func.call(obj, keyName, value);
  if (cacheable) m.cache[keyName] = ret;
  if (watched) Ember.propertyDidChange(obj, keyName);
  this._suspended = oldSuspended;
  return ret;
};

Cp.val = function(obj, keyName) {
  return meta(obj, false).values[keyName];
};

if (!Ember.platform.hasPropertyAccessors) {
  Cp.setup = function(obj, keyName, value) {
    obj[keyName] = undefined; // so it shows up in key iteration
    addDependentKeys(this, obj, keyName);
  };

} else if (!USE_ACCESSORS) {
  Cp.setup = function(obj, keyName) {
    // throw exception if not using Ember.get() and Ember.set() when supported
    o_defineProperty(obj, keyName, CP_DESC);
    addDependentKeys(this, obj, keyName);
  };
}

/**
  This helper returns a new property descriptor that wraps the passed
  computed property function.  You can use this helper to define properties
  with mixins or via Ember.defineProperty().

  The function you pass will be used to both get and set property values.
  The function should accept two parameters, key and value.  If value is not
  undefined you should set the value first.  In either case return the
  current value of the property.

  @param {Function} func
    The computed property function.

  @returns {Ember.ComputedProperty} property descriptor instance
*/
Ember.computed = function(func) {
  var args;

  if (arguments.length > 1) {
    args = a_slice.call(arguments, 0, -1);
    func = a_slice.call(arguments, -1)[0];
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

  @param {Object} obj the object whose property you want to check
  @param {String} key the name of the property whose cached value you want
                      to return

*/
Ember.cacheFor = function(obj, key) {
  var cache = meta(obj, false).cache;

  if (cache && key in cache) {
    return cache[key];
  }
};
