/**
@module @ember/object
*/

import { assert } from 'ember-debug';
import { HAS_NATIVE_PROXY } from 'ember-utils';
import { descriptorFor, meta as metaFor, peekMeta, DESCRIPTOR, UNDEFINED } from './meta';
import { overrideChains } from './property_events';
import { DESCRIPTOR_TRAP, EMBER_METAL_ES5_GETTERS, MANDATORY_SETTER } from 'ember/features';
// ..........................................................
// DESCRIPTOR
//

/**
  Objects of this type can implement an interface to respond to requests to
  get and set. The default implementation handles simple properties.

  @class Descriptor
  @private
*/
export function Descriptor() {
  this.isDescriptor = true;
}

// ..........................................................
// DEFINING PROPERTIES API
//

export function MANDATORY_SETTER_FUNCTION(name) {
  function SETTER_FUNCTION(value) {
    let m = peekMeta(this);
    if (!m.isInitialized(this)) {
      m.writeValues(name, value);
    } else {
      assert(`You must use set() to set the \`${name}\` property (of ${this}) to \`${value}\`.`, false);
    }
  }

  SETTER_FUNCTION.isMandatorySetter = true;
  return SETTER_FUNCTION;
}

export function DEFAULT_GETTER_FUNCTION(name) {
  return function GETTER_FUNCTION() {
    let meta = peekMeta(this);
    if (meta !== undefined) {
      return meta.peekValues(name);
    }
  };
}

export function INHERITING_GETTER_FUNCTION(name) {
  function IGETTER_FUNCTION() {
    let meta = peekMeta(this);
    let val;
    if (meta !== undefined) {
      val = meta.readInheritedValue('values', name);
    }

    if (val === UNDEFINED) {
      let proto = Object.getPrototypeOf(this);
      return proto && proto[name];
    } else {
      return val;
    }
  }

  IGETTER_FUNCTION.isInheritingGetter = true;
  return IGETTER_FUNCTION;
}

let DESCRIPTOR_GETTER_FUNCTION;

if (EMBER_METAL_ES5_GETTERS) {
  DESCRIPTOR_GETTER_FUNCTION = function(name, descriptor) {
    return function CPGETTER_FUNCTION() {
      return descriptor.get(this, name);
    };
  };
} else if (DESCRIPTOR_TRAP) {
  // Future traveler, although this code looks scary. It merely exists in
  // development to aid in development asertions. Production builds of
  // ember strip this entire branch out.
  let messageFor = function(obj, keyName, property, value) {
    return `You attempted to access the \`${keyName}.${property}\` property ` +
      `(of ${obj}). Due to certain internal implementation details of Ember, ` +
      `the \`${keyName}\` property previously contained an internal "descriptor" ` +
      `object (a private API), therefore \`${keyName}.${property}\` would have ` +
      `been \`${String(value).replace(/\n/g, ' ')}\`. This internal implementation ` +
      `detail was never intended to be a public (or even intimate) API.\n\n` +
      `This internal implementation detail has now changed and the (still private) ` +
      `"descriptor" object has been relocated to the object's "meta" (also a ` +
      `private API). Soon, accessing \`${keyName}\` on this object will ` +
      `return the computed value (see RFC #281 for more details).\n\n` +
      `If you are seeing this error, you are likely using an addon that ` +
      `relies on this now-defunct private implementation detail. If you can, ` +
      `find out which addon is doing this from the stack trace below and ` +
      `report this bug to the addon authors. If you feel stuck, the Ember ` +
      `Community Slack (https://ember-community-slackin.herokuapp.com/) ` +
      `may be able to offer some help.\n\n` +
      `If you are an addon author and need help transitioning your code, ` +
      `please get in touch in the #dev-ember channel in the Ember Community ` +
      `Slack.`;
  };

  let trapFor;

  if (HAS_NATIVE_PROXY) {
    /* globals Proxy */
    trapFor = function(obj, keyName, descriptor) {
      return new Proxy(descriptor, {
        get(descriptor, property) {
          if (property === DESCRIPTOR) {
            return descriptor;
          } else if (property === 'toString' || property == 'valueOf' ||
            property == 'inspect' || property == 'constructor' ||
            (Symbol && property === Symbol.toPrimitive)) {
            return () => '[COMPUTED PROPERTY]';
          }

          assert(messageFor(obj, keyName, property, descriptor[property]));
        }
      });
    };
  } else {
    trapFor = function(obj, keyName, descriptor) {
      let trap = Object.create(null);

      Object.defineProperty(trap, DESCRIPTOR, {
        configurable: false,
        enumerable: false,
        writable: false,
        value: descriptor
      });

      trap.toString = trap.valueOf = () => '[COMPUTED PROPERTY]';

      // Without a proxy, we can only trap the "likely" properties
      ['isDescriptor', 'setup', 'teardown', 'get', '_getter', 'set', '_setter', 'meta'].forEach(property => {
        Object.defineProperty(trap, property, {
          configurable: false,
          enumerable: false,
          get() {
            assert(messageFor(obj, keyName, property, descriptor[property]));
          }
        });
      });

      return trap;
    };
  }

  DESCRIPTOR_GETTER_FUNCTION = function(name, descriptor) {
    return function CPGETTER_FUNCTION() {
      return trapFor(this, name, descriptor);
    };
  };
}

/**
  NOTE: This is a low-level method used by other parts of the API. You almost
  never want to call this method directly. Instead you should use
  `mixin()` to define new properties.

  Defines a property on an object. This method works much like the ES5
  `Object.defineProperty()` method except that it can also accept computed
  properties and other special descriptors.

  Normally this method takes only three parameters. However if you pass an
  instance of `Descriptor` as the third param then you can pass an
  optional value as the fourth parameter. This is often more efficient than
  creating new descriptor hashes for each property.

  ## Examples

  ```javascript
  import { defineProperty, computed } from '@ember/object';

  // ES5 compatible mode
  defineProperty(contact, 'firstName', {
    writable: true,
    configurable: false,
    enumerable: true,
    value: 'Charles'
  });

  // define a simple property
  defineProperty(contact, 'lastName', undefined, 'Jolley');

  // define a computed property
  defineProperty(contact, 'fullName', computed('firstName', 'lastName', function() {
    return this.firstName+' '+this.lastName;
  }));
  ```

  @private
  @method defineProperty
  @for @ember/object
  @param {Object} obj the object to define this property on. This may be a prototype.
  @param {String} keyName the name of the property
  @param {Descriptor} [desc] an instance of `Descriptor` (typically a
    computed property) or an ES5 descriptor.
    You must provide this or `data` but not both.
  @param {*} [data] something other than a descriptor, that will
    become the explicit value of this property.
*/
export function defineProperty(obj, keyName, desc, data, meta) {
  if (meta === undefined) { meta = metaFor(obj); }

  let watchEntry = meta.peekWatching(keyName);
  let watching = watchEntry !== undefined && watchEntry > 0;
  let previousDesc = descriptorFor(obj, keyName, meta);
  let wasDescriptor = previousDesc !== undefined;

  if (wasDescriptor) {
    previousDesc.teardown(obj, keyName, meta);

    if (EMBER_METAL_ES5_GETTERS) {
      meta.removeDescriptors(keyName);
    }
  }

  let value;
  if (desc instanceof Descriptor) {
    value = desc;

    if (EMBER_METAL_ES5_GETTERS || DESCRIPTOR_TRAP) {
      Object.defineProperty(obj, keyName, {
        configurable: true,
        enumerable: true,
        get: DESCRIPTOR_GETTER_FUNCTION(keyName, value)
      });
    } else if (MANDATORY_SETTER && watching) {
      Object.defineProperty(obj, keyName, {
        configurable: true,
        enumerable: true,
        writable: true,
        value
      });
    } else {
      obj[keyName] = value;
    }

    if (EMBER_METAL_ES5_GETTERS) {
      meta.writeDescriptors(keyName, value);
    }

    didDefineComputedProperty(obj.constructor);

    if (typeof desc.setup === 'function') { desc.setup(obj, keyName); }
  } else if (desc === undefined || desc === null) {
    value = data;

    if (MANDATORY_SETTER && watching) {
      meta.writeValues(keyName, data);

      let defaultDescriptor = {
        configurable: true,
        enumerable: true,
        set: MANDATORY_SETTER_FUNCTION(keyName),
        get: DEFAULT_GETTER_FUNCTION(keyName)
      };

      Object.defineProperty(obj, keyName, defaultDescriptor);
    } else if ((EMBER_METAL_ES5_GETTERS || DESCRIPTOR_TRAP) && wasDescriptor) {
      Object.defineProperty(obj, keyName, {
        configurable: true,
        enumerable: true,
        writable: true,
        value
      });
    } else {
      obj[keyName] = data;
    }
  } else {
    value = desc;

    // fallback to ES5
    Object.defineProperty(obj, keyName, desc);
  }

  // if key is being watched, override chains that
  // were initialized with the prototype
  if (watching) { overrideChains(obj, keyName, meta); }

  // The `value` passed to the `didDefineProperty` hook is
  // either the descriptor or data, whichever was passed.
  if (typeof obj.didDefineProperty === 'function') { obj.didDefineProperty(obj, keyName, value); }

  return this;
}

let hasCachedComputedProperties = false;
export function _hasCachedComputedProperties() {
  hasCachedComputedProperties = true;
}

function didDefineComputedProperty(constructor) {
  if (hasCachedComputedProperties === false) { return; }
  let cache = metaFor(constructor).readableCache();

  if (cache && cache._computedProperties !== undefined) {
    cache._computedProperties = undefined;
  }
}
