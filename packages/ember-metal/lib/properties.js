/**
@module ember-metal
*/

import Ember from "ember-metal/core";
import {
  meta as metaFor,
  META_KEY
} from "ember-metal/utils";
import {
  defineProperty as objectDefineProperty,
  hasPropertyAccessors
} from "ember-metal/platform";
import { overrideChains } from "ember-metal/property_events";
// ..........................................................
// DESCRIPTOR
//

/**
  Objects of this type can implement an interface to respond to requests to
  get and set. The default implementation handles simple properties.

  You generally won't need to create or subclass this directly.

  @class Descriptor
  @namespace Ember
  @private
  @constructor
*/
export function Descriptor() {}

// ..........................................................
// DEFINING PROPERTIES API
//

export function MANDATORY_SETTER_FUNCTION(name) {
  return function SETTER_FUNCTION(value) {
    Ember.assert("You must use Ember.set() to set the `" + name + "` property (of " + this + ") to `" + value + "`.", false);
  };
}

export function DEFAULT_GETTER_FUNCTION(name) {
  return function GETTER_FUNCTION() {
    var meta = this[META_KEY];
    return meta && meta.values[name];
  };
}

/**
  NOTE: This is a low-level method used by other parts of the API. You almost
  never want to call this method directly. Instead you should use
  `Ember.mixin()` to define new properties.

  Defines a property on an object. This method works much like the ES5
  `Object.defineProperty()` method except that it can also accept computed
  properties and other special descriptors.

  Normally this method takes only three parameters. However if you pass an
  instance of `Ember.Descriptor` as the third param then you can pass an
  optional value as the fourth parameter. This is often more efficient than
  creating new descriptor hashes for each property.

  ## Examples

  ```javascript
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
  }).property('firstName', 'lastName'));
  ```

  @private
  @method defineProperty
  @for Ember
  @param {Object} obj the object to define this property on. This may be a prototype.
  @param {String} keyName the name of the property
  @param {Ember.Descriptor} [desc] an instance of `Ember.Descriptor` (typically a
    computed property) or an ES5 descriptor.
    You must provide this or `data` but not both.
  @param {*} [data] something other than a descriptor, that will
    become the explicit value of this property.
*/
export function defineProperty(obj, keyName, desc, data, meta) {
  var descs, existingDesc, watching, value;

  if (!meta) meta = metaFor(obj);
  descs = meta.descs;
  existingDesc = meta.descs[keyName];
  var watchEntry = meta.watching[keyName];

  watching = watchEntry !== undefined && watchEntry > 0;

  if (existingDesc instanceof Descriptor) {
    existingDesc.teardown(obj, keyName);
  }

  if (desc instanceof Descriptor) {
    value = desc;

    descs[keyName] = desc;
    if (Ember.FEATURES.isEnabled('mandatory-setter')) {
      if (watching && hasPropertyAccessors) {
        objectDefineProperty(obj, keyName, {
          configurable: true,
          enumerable: true,
          writable: true,
          value: undefined // make enumerable
        });
      } else {
        obj[keyName] = undefined; // make enumerable
      }
    } else {
      obj[keyName] = undefined; // make enumerable
    }
    if (desc.setup) { desc.setup(obj, keyName); }
  } else {
    descs[keyName] = undefined; // shadow descriptor in proto
    if (desc == null) {
      value = data;

      if (Ember.FEATURES.isEnabled('mandatory-setter')) {
        if (watching && hasPropertyAccessors) {
          meta.values[keyName] = data;
          objectDefineProperty(obj, keyName, {
            configurable: true,
            enumerable: true,
            set: MANDATORY_SETTER_FUNCTION(keyName),
            get: DEFAULT_GETTER_FUNCTION(keyName)
          });
        } else {
          obj[keyName] = data;
        }
      } else {
        obj[keyName] = data;
      }
    } else {
      value = desc;

      // compatibility with ES5
      objectDefineProperty(obj, keyName, desc);
    }
  }

  // if key is being watched, override chains that
  // were initialized with the prototype
  if (watching) { overrideChains(obj, keyName, meta); }

  // The `value` passed to the `didDefineProperty` hook is
  // either the descriptor or data, whichever was passed.
  if (obj.didDefineProperty) { obj.didDefineProperty(obj, keyName, value); }

  return this;
}
