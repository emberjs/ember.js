import { set } from "ember-metal/property_set";
import {
  meta,
  inspect
} from "ember-metal/utils";
import expandProperties from "ember-metal/expand_properties";
import EmberError from "ember-metal/error";
import {
  Descriptor,
  defineProperty
} from "ember-metal/properties";
import {
  propertyWillChange,
  propertyDidChange
} from "ember-metal/property_events";
import {
  addDependentKeys,
  removeDependentKeys
} from "ember-metal/dependent_keys";

/**
@module ember-metal
*/

var metaFor = meta;

function UNDEFINED() { }

// ..........................................................
// COMPUTED PROPERTY
//

/**
  A computed property transforms an object's function into a property.

  By default the function backing the computed property will only be called
  once and the result will be cached. You can specify various properties
  that your computed property depends on. This will force the cached
  result to be recomputed if the dependencies are modified.

  In the following example we declare a computed property (by calling
  `.property()` on the fullName function) and setup the property
  dependencies (depending on firstName and lastName). The fullName function
  will be called once (regardless of how many times it is accessed) as long
  as its dependencies have not changed. Once firstName or lastName are updated
  any future calls (or anything bound) to fullName will incorporate the new
  values.

  ```javascript
  var Person = Ember.Object.extend({
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
  var Person = Ember.Object.extend({
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
        var name = value.split(' ');

        this.set('firstName', name[0]);
        this.set('lastName', name[1]);

        return value;
      }
    }.property('firstName', 'lastName')
  });

  var person = Person.create();

  person.set('fullName', 'Peter Wagenet');
  person.get('firstName'); // 'Peter'
  person.get('lastName');  // 'Wagenet'
  ```

  @class ComputedProperty
  @namespace Ember
  @constructor
*/
function ComputedProperty(config, opts) {
  this.isDescriptor = true;
  if (Ember.FEATURES.isEnabled("new-computed-syntax")) {
    if (typeof config === "function") {
      config.__ember_arity = config.length;
      this._getter = config;
      if (config.__ember_arity > 1) {
        Ember.deprecate("Using the same function as getter and setter is deprecated.", false, {
          url: "http://emberjs.com/deprecations/v1.x/#toc_computed-properties-with-a-shared-getter-and-setter"
        });
        this._setter = config;
      }
    } else {
      this._getter = config.get;
      this._setter = config.set;
      if (this._setter && this._setter.__ember_arity === undefined) {
        this._setter.__ember_arity = this._setter.length;
      }
    }
  } else {
    config.__ember_arity = config.length;
    this._getter = config;
    if (config.__ember_arity > 1) {
      this._setter = config;
    }
  }

  this._dependentKeys = undefined;
  this._suspended = undefined;
  this._meta = undefined;

  Ember.deprecate("Passing opts.cacheable to the CP constructor is deprecated. Invoke `volatile()` on the CP instead.", !opts || !opts.hasOwnProperty('cacheable'));
  this._cacheable = (opts && opts.cacheable !== undefined) ? opts.cacheable : true;   // TODO: Set always to `true` once this deprecation is gone.
  this._dependentKeys = opts && opts.dependentKeys;
  Ember.deprecate("Passing opts.readOnly to the CP constructor is deprecated. All CPs are writable by default. You can invoke `readOnly()` on the CP to change this.", !opts || !opts.hasOwnProperty('readOnly'));
  this._readOnly = opts && (opts.readOnly !== undefined || !!opts.readOnly) || false; // TODO: Set always to `false` once this deprecation is gone.
}

ComputedProperty.prototype = new Descriptor();

var ComputedPropertyPrototype = ComputedProperty.prototype;

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
  @deprecated All computed properties are cacheble by default. Use `volatile()` instead to opt-out to caching.
*/
ComputedPropertyPrototype.cacheable = function(aFlag) {
  Ember.deprecate('ComputedProperty.cacheable() is deprecated. All computed properties are cacheable by default.');
  this._cacheable = aFlag !== false;
  return this;
};

/**
  Call on a computed property to set it into non-cached mode. When in this
  mode the computed property will not automatically cache the return value.

  ```javascript
  var outsideService = Ember.Object.extend({
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
  this._cacheable = false;
  return this;
};

/**
  Call on a computed property to set it into read-only mode. When in this
  mode the computed property will throw an error when set.

  ```javascript
  var Person = Ember.Object.extend({
    guid: function() {
      return 'guid-guid-guid';
    }.property().readOnly()
  });

  var person = Person.create();

  person.set('guid', 'new-guid'); // will throw an exception
  ```

  @method readOnly
  @return {Ember.ComputedProperty} this
  @chainable
*/
ComputedPropertyPrototype.readOnly = function(readOnly) {
  Ember.deprecate('Passing arguments to ComputedProperty.readOnly() is deprecated.', arguments.length === 0);
  this._readOnly = readOnly === undefined || !!readOnly; // Force to true once this deprecation is gone
  Ember.assert("Computed properties that define a setter cannot be read-only", !(this._readOnly && this._setter));
  return this;
};

/**
  Sets the dependent keys on this computed property. Pass any number of
  arguments containing key paths that this computed property depends on.

  ```javascript
  var President = Ember.Object.extend({
    fullName: computed(function() {
      return this.get('firstName') + ' ' + this.get('lastName');

      // Tell Ember that this computed property depends on firstName
      // and lastName
    }).property('firstName', 'lastName')
  });

  var president = President.create({
    firstName: 'Barack',
    lastName: 'Obama'
  });

  president.get('fullName'); // 'Barack Obama'
  ```

  @method property
  @param {String} path* zero or more property paths
  @return {Ember.ComputedProperty} this
  @chainable
*/
ComputedPropertyPrototype.property = function() {
  var args;

  var addArg = function(property) {
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
    if (meta.cache && meta.cache[keyName] !== undefined) {
      meta.cache[keyName] = undefined;
      removeDependentKeys(this, obj, keyName, meta);
    }
  }
};

function finishChains(chainNodes) {
  for (var i=0, l=chainNodes.length; i<l; i++) {
    chainNodes[i].didChange(null);
  }
}

/**
  Access the value of the function backing the computed property.
  If this property has already been cached, return the cached result.
  Otherwise, call the function passing the property name as an argument.

  ```javascript
  var Person = Ember.Object.extend({
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

    var result = cache && cache[keyName];

    if (result === UNDEFINED) {
      return undefined;
    } else if (result !== undefined) {
      return result;
    }

    ret = this._getter.call(obj, keyName);
    cache = meta.cache;
    if (!cache) {
      cache = meta.cache = {};
    }
    if (ret === undefined) {
      cache[keyName] = UNDEFINED;
    } else {
      cache[keyName] = ret;
    }

    chainNodes = meta.chainWatchers && meta.chainWatchers[keyName];
    if (chainNodes) {
      finishChains(chainNodes);
    }
    addDependentKeys(this, obj, keyName, meta);
  } else {
    ret = this._getter.call(obj, keyName);
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

  ```javascript
  var Person = Ember.Object.extend({
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
        var name = value.split(' ');

        this.set('firstName', name[0]);
        this.set('lastName', name[1]);

        return value;
      }
    }.property('firstName', 'lastName')
  });

  var person = Person.create();

  person.set('fullName', 'Peter Wagenet');
  person.get('firstName'); // 'Peter'
  person.get('lastName');  // 'Wagenet'
  ```

  @method set
  @param {String} keyName The key being accessed.
  @param {Object} newValue The new value being assigned.
  @param {String} oldValue The old value being replaced.
  @return {Object} The return value of the function backing the CP.
*/
ComputedPropertyPrototype.set = function computedPropertySetWithSuspend(obj, keyName, value) {
  var oldSuspended = this._suspended;

  this._suspended = obj;

  try {
    this._set(obj, keyName, value);
  } finally {
    this._suspended = oldSuspended;
  }
};

ComputedPropertyPrototype._set = function computedPropertySet(obj, keyName, value) {
  var cacheable      = this._cacheable;
  var setter         = this._setter;
  var meta           = metaFor(obj, cacheable);
  var cache          = meta.cache;
  var hadCachedValue = false;

  var cachedValue, ret;

  if (this._readOnly) {
    throw new EmberError(`Cannot set read-only property "${keyName}" on object: ${inspect(obj)}`);
  }

  if (cacheable && cache && cache[keyName] !== undefined) {
    if (cache[keyName] !== UNDEFINED) {
      cachedValue = cache[keyName];
    }

    hadCachedValue = true;
  }

  if (!setter) {
    defineProperty(obj, keyName, null, cachedValue);
    set(obj, keyName, value);
    return;
  } else if (setter.__ember_arity === 2) {
    // Is there any way of deprecate this in a sensitive way?
    // Maybe now that getters and setters are the prefered options we can....
    ret = setter.call(obj, keyName, value);
  } else {
    ret = setter.call(obj, keyName, value, cachedValue);
  }

  if (hadCachedValue && cachedValue === ret) { return; }

  var watched = meta.watching[keyName];
  if (watched) {
    propertyWillChange(obj, keyName);
  }

  if (hadCachedValue) {
    cache[keyName] = undefined;
  }

  if (cacheable) {
    if (!hadCachedValue) {
      addDependentKeys(this, obj, keyName, meta);
    }
    if (!cache) {
      cache = meta.cache = {};
    }
    if (ret === undefined) {
      cache[keyName] = UNDEFINED;
    } else {
      cache[keyName] = ret;
    }
  }

  if (watched) {
    propertyDidChange(obj, keyName);
  }

  return ret;
};

/* called before property is overridden */
ComputedPropertyPrototype.teardown = function(obj, keyName) {
  var meta = metaFor(obj);

  if (meta.cache) {
    if (keyName in meta.cache) {
      removeDependentKeys(this, obj, keyName, meta);
    }

    if (this._cacheable) { delete meta.cache[keyName]; }
  }

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

  A computed property defined in this way might look like this:

  ```js
  var Person = Ember.Object.extend({
    firstName: 'Betty',
    lastName: 'Jones',

    fullName: Ember.computed('firstName', 'lastName', function(key, value) {
      return this.get('firstName') + ' ' + this.get('lastName');
    })
  });

  var client = Person.create();

  client.get('fullName'); // 'Betty Jones'

  client.set('lastName', 'Fuller');
  client.get('fullName'); // 'Betty Fuller'
  ```

  _Note: This is the preferred way to define computed properties when writing third-party
  libraries that depend on or use Ember, since there is no guarantee that the user
  will have prototype extensions enabled._

  You might use this method if you disabled
  [Prototype Extensions](http://emberjs.com/guides/configuring-ember/disabling-prototype-extensions/).
  The alternative syntax might look like this
  (if prototype extensions are enabled, which is the default behavior):

  ```js
  fullName: function () {
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
*/
function computed(func) {
  var args;

  if (arguments.length > 1) {
    args = [].slice.call(arguments);
    func = args.pop();
  }

  var cp = new ComputedProperty(func);
  // jscs:disable
  if (Ember.FEATURES.isEnabled("new-computed-syntax")) {
    // Empty block on purpose
  } else {
    // jscs:enable
    if (typeof func !== "function") {
      throw new EmberError("Computed Property declared without a property function");
    }
  }

  if (args) {
    cp.property.apply(cp, args);
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
*/
function cacheFor(obj, key) {
  var meta = obj['__ember_meta__'];
  var cache = meta && meta.cache;
  var ret = cache && cache[key];

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
  var ret = cache[key];
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
