// ==========================================================================
// Project:  Ember Metal
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require('ember-metal/core');
require('ember-metal/platform');
require('ember-metal/utils');
require('ember-metal/accessors');

var USE_ACCESSORS = Ember.USE_ACCESSORS,
    GUID_KEY = Ember.GUID_KEY,
    META_KEY = Ember.META_KEY,
    meta = Ember.meta,
    o_create = Ember.create,
    objectDefineProperty = Ember.platform.defineProperty,
    SIMPLE_PROPERTY, WATCHED_PROPERTY;

// ..........................................................
// DESCRIPTOR
//

/**
  @private
  @constructor

  Objects of this type can implement an interface to responds requests to
  get and set.  The default implementation handles simple properties.

  You generally won't need to create or subclass this directly.
*/
var Descriptor = Ember.Descriptor = function() {};

var setup = Descriptor.setup = function(obj, keyName, value) {
  objectDefineProperty(obj, keyName, {
    writable: true,
    configurable: true,
    enumerable: true,
    value: value
  });
};

var DescriptorPrototype = Ember.Descriptor.prototype;

/**
  Called whenever we want to set the property value.  Should set the value
  and return the actual set value (which is usually the same but may be
  different in the case of computed properties.)

  @param {Object} obj
    The object to set the value on.

  @param {String} keyName
    The key to set.

  @param {Object} value
    The new value

  @returns {Object} value actual set value
*/
DescriptorPrototype.set = function(obj, keyName, value) {
  obj[keyName] = value;
  return value;
};

/**
  Called whenever we want to get the property value.  Should retrieve the
  current value.

  @param {Object} obj
    The object to get the value on.

  @param {String} keyName
    The key to retrieve

  @returns {Object} the current value
*/
DescriptorPrototype.get = function(obj, keyName) {
  return get(obj, keyName, obj);
};

/**
  This is called on the descriptor to set it up on the object.  The
  descriptor is responsible for actually defining the property on the object
  here.

  The passed `value` is the transferValue returned from any previous
  descriptor.

  @param {Object} obj
    The object to set the value on.

  @param {String} keyName
    The key to set.

  @param {Object} value
    The transfer value from any previous descriptor.

  @returns {void}
*/
DescriptorPrototype.setup = setup;

/**
  This is called on the descriptor just before another descriptor takes its
  place.  This method should at least return the 'transfer value' of the
  property - which is the value you want to passed as the input to the new
  descriptor's setup() method.

  It is not generally necessary to actually 'undefine' the property as a new
  property descriptor will redefine it immediately after this method returns.

  @param {Object} obj
    The object to set the value on.

  @param {String} keyName
    The key to set.

  @returns {Object} transfer value
*/
DescriptorPrototype.teardown = function(obj, keyName) {
  return obj[keyName];
};

DescriptorPrototype.val = function(obj, keyName) {
  return obj[keyName];
};

// ..........................................................
// SIMPLE AND WATCHED PROPERTIES
//

// The exception to this is that any objects managed by Ember but not a descendant
// of Ember.Object will not throw an exception, instead failing silently. This
// prevent errors with other libraries that may attempt to access special
// properties on standard objects like Array. Usually this happens when copying
// an object by looping over all properties.
//
// QUESTION: What is this scenario exactly?
var mandatorySetter = Ember.Descriptor.MUST_USE_SETTER = function() {
  if (this instanceof Ember.Object) {
    if (this.isDestroyed) {
      Ember.assert('You cannot set observed properties on destroyed objects', false);
    } else {
      Ember.assert('Must use Ember.set() to access this property', false);
    }
  }
};

var WATCHED_DESC = {
  configurable: true,
  enumerable:   true,
  set: mandatorySetter
};

/** @private */
function rawGet(obj, keyName, values) {
  var ret = values[keyName];
  if (ret === undefined && obj.unknownProperty) {
    ret = obj.unknownProperty(keyName);
  }
  return ret;
}

function get(obj, keyName) {
  return rawGet(obj, keyName, obj);
}

var emptyObject = {};

function watchedGet(obj, keyName) {
  return rawGet(obj, keyName, meta(obj, false).values || emptyObject);
}

var hasGetters = Ember.platform.hasPropertyAccessors, rawSet;

rawSet = function(obj, keyName, value, values) {
  values[keyName] = value;
};

// if there are no getters, keep the raw property up to date
if (!Ember.platform.hasPropertyAccessors) {
  rawSet = function(obj, keyName, value, values) {
    obj[keyName] = value;
    values[keyName] = value;
  };
}

/** @private */
function watchedSet(obj, keyName, value) {
  var m = meta(obj),
      values = m.values,
      changed = value !== values[keyName];

  if (changed) {
    Ember.propertyWillChange(obj, keyName);
    rawSet(obj, keyName, value, m.values);
    Ember.propertyDidChange(obj, keyName);
  }

  return value;
}

/** @private */
function makeWatchedGetter(keyName) {
  return function() {
    return watchedGet(this, keyName);
  };
}

/** @private */
function makeWatchedSetter(keyName) {
  return function(value) {
    return watchedSet(this, keyName, value);
  };
}

/**
  @private

  Private version of simple property that invokes property change callbacks.
*/
WATCHED_PROPERTY = new Ember.Descriptor();
WATCHED_PROPERTY.get = watchedGet ;
WATCHED_PROPERTY.set = watchedSet ;

WATCHED_PROPERTY.setup = function(obj, keyName, value) {
  objectDefineProperty(obj, keyName, {
    configurable: true,
    enumerable:   true,
    set: mandatorySetter,
    get: makeWatchedGetter(keyName)
  });

  meta(obj).values[keyName] = value;
};

WATCHED_PROPERTY.teardown = function(obj, keyName) {
  var ret = meta(obj).values[keyName];
  delete meta(obj).values[keyName];
  return ret;
};

/**
  The default descriptor for simple properties.  Pass as the third argument
  to Ember.defineProperty() along with a value to set a simple value.

  @static
  @default Ember.Descriptor
*/
Ember.SIMPLE_PROPERTY = new Ember.Descriptor();
SIMPLE_PROPERTY = Ember.SIMPLE_PROPERTY;

SIMPLE_PROPERTY.unwatched = WATCHED_PROPERTY.unwatched = SIMPLE_PROPERTY;
SIMPLE_PROPERTY.watched   = WATCHED_PROPERTY.watched   = WATCHED_PROPERTY;

// ..........................................................
// DEFINING PROPERTIES API
//

/** @private */
function hasDesc(descs, keyName) {
  if (keyName === 'toString') return 'function' !== typeof descs.toString;
  else return !!descs[keyName];
}

/**
  @private

  NOTE: This is a low-level method used by other parts of the API.  You almost
  never want to call this method directly.  Instead you should use Ember.mixin()
  to define new properties.

  Defines a property on an object.  This method works much like the ES5
  Object.defineProperty() method except that it can also accept computed
  properties and other special descriptors.

  Normally this method takes only three parameters.  However if you pass an
  instance of Ember.Descriptor as the third param then you can pass an optional
  value as the fourth parameter.  This is often more efficient than creating
  new descriptor hashes for each property.

  ## Examples

      // ES5 compatible mode
      Ember.defineProperty(contact, 'firstName', {
        writable: true,
        configurable: false,
        enumerable: true,
        value: 'Charles'
      });

      // define a simple property
      Ember.defineProperty(contact, 'lastName', Ember.SIMPLE_PROPERTY, 'Jolley');

      // define a computed property
      Ember.defineProperty(contact, 'fullName', Ember.computed(function() {
        return this.firstName+' '+this.lastName;
      }).property('firstName', 'lastName').cacheable());
*/
Ember.defineProperty = function(obj, keyName, desc, val) {
  var m = meta(obj, false),
      descs = m.descs,
      watching = m.watching[keyName]>0,
      override = true;

  if (val === undefined) {
    // if a value wasn't provided, the value is the old value
    // (which can be obtained by calling teardown on a property
    // with a descriptor).
    override = false;
    val = hasDesc(descs, keyName) ? descs[keyName].teardown(obj, keyName) : obj[keyName];
  } else if (hasDesc(descs, keyName)) {
    // otherwise, tear down the descriptor, but use the provided
    // value as the new value instead of the descriptor's current
    // value.
    descs[keyName].teardown(obj, keyName);
  }

  if (!desc) {
    desc = SIMPLE_PROPERTY;
  }

  if (desc instanceof Ember.Descriptor) {
    m = meta(obj, true);
    descs = m.descs;

    desc = (watching ? desc.watched : desc.unwatched) || desc;
    descs[keyName] = desc;
    desc.setup(obj, keyName, val, watching);

  // compatibility with ES5
  } else {
    if (descs[keyName]) meta(obj).descs[keyName] = null;
    objectDefineProperty(obj, keyName, desc);
  }

  // if key is being watched, override chains that
  // were initialized with the prototype
  if (override && watching) Ember.overrideChains(obj, keyName, m);

  return this;
};

