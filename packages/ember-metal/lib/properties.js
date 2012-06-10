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
    EMPTY_META = Ember.EMPTY_META,
    metaFor = Ember.meta,
    o_create = Ember.create,
    objectDefineProperty = Ember.platform.defineProperty;

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

// ..........................................................
// DEFINING PROPERTIES API
//

/** @private */
function hasDesc(descs, keyName) {
  if (keyName === 'toString') return 'function' !== typeof descs.toString;
  else return !!descs[keyName];
}

var extractValue = function(obj, keyName, watching) {
  if (watching) {
    var values = metaFor(obj).values,
        ret = values[keyName];

    delete values[keyName];
    return ret;
  } else {
    return obj[keyName];
  }
};

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
      Ember.defineProperty(contact, 'lastName', undefined, 'Jolley');

      // define a computed property
      Ember.defineProperty(contact, 'fullName', Ember.computed(function() {
        return this.firstName+' '+this.lastName;
      }).property('firstName', 'lastName').cacheable());
*/
Ember.defineProperty = function(obj, keyName, desc, val) {
  var meta = obj[META_KEY] || EMPTY_META,
      descs = meta && meta.descs,
      native = keyName in {},
      watching = !native && meta.watching[keyName],
      descriptor = desc instanceof Ember.Descriptor;

  var existingDesc = hasDesc(descs, keyName);

  if (val === undefined && descriptor) {

    if (existingDesc) { val = descs[keyName].teardown(obj, keyName); }
    else { val = extractValue(obj, keyName, watching); }

  } else if (existingDesc) {
    // otherwise, tear down the descriptor, but use the provided
    // value as the new value instead of the descriptor's current
    // value.
    descs[keyName].teardown(obj, keyName);
  }

  if (descriptor) {
    meta = metaFor(obj);
    descs = meta.descs;

    descs[keyName] = desc;
    desc.setup(obj, keyName, val);

  } else {
    if (!native && descs[keyName]) { metaFor(obj).descs[keyName] = null; }

    if (desc == null) {
      if (existingDesc) {
        objectDefineProperty(obj, keyName, {
          enumerable: true,
          configurable: true,
          writable: true,
          value: undefined
        });
      }

      if (watching) {
        Ember.watchedSet(obj, keyName, val);
      } else {
        obj[keyName] = val;
      }
    } else {
      // compatibility with ES5
      objectDefineProperty(obj, keyName, desc);
    }
  }

  // if key is being watched, override chains that
  // were initialized with the prototype
  if (watching) { Ember.overrideChains(obj, keyName, meta); }

  return this;
};

