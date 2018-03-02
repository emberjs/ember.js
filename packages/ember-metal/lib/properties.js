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
export class Descriptor {
  constructor() {
    this.isDescriptor = true;
    this.enumerable = true;
  }
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
    return `You attempted to access \`${keyName}.${String(property)}\` ` +
      `(on \`${obj}\`), but \`${keyName}\` is a computed property.\n\n` +
      `Due to certain internal implementation details of Ember, the ` +
      `\`${keyName}\` property previously contained a private "descriptor" ` +
      `object, therefore \`${keyName}.${String(property)}\` would have been ` +
      `\`${String(value).replace(/\n/g, ' ')}\`.\n\n` +
      `This implementation detail has now changed and the "descriptor" ` +
      `object is no longer present at this location. Soon, accessing ` +
      `\`${keyName}\` on this object will return the computed property's ` +
      `current value (see RFC #281 for more details: https://github.com/emberjs/rfcs/blob/master/text/0281-es5-getters.md).\n\n` +
      `If you are seeing this error, you are likely using an addon that ` +
      `relies on this now-defunct private implementation detail. If you ` +
      `can, identify the addon from the stack trace below and report this ` +
      `bug to the addon authors. If you feel stuck, the Ember Community ` +
      `Slack (https://ember-community-slackin.herokuapp.com/) may be able ` +
      `to offer some help.\n\n` +
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
          } else if (
            property === 'prototype' ||
            property === 'constructor' ||
            property === 'nodeType' ||
            property === 'window'
          ) {
            return undefined;
          } else if (
            property === 'toString' ||
            property === 'valueOf' ||
            property === 'inspect' ||
            Symbol && property === Symbol.toPrimitive ||
            Symbol && property === Symbol.toStringTag
          ) {
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
    let trap;
    return function CPGETTER_FUNCTION() {
      if (trap) { return trap; }

      trap = trapFor(this, name, descriptor);
      return trap;
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

  // used to track if the the property being defined be enumerable
  let enumerable = true;

  // Ember.NativeArray is a normal Ember.Mixin that we mix into `Array.prototype` when prototype extensions are enabled
  // mutating a native object prototype like this should _not_ result in enumerable properties being added (or we have significant
  // issues with things like deep equality checks from test frameworks, or things like jQuery.extend(true, [], [])).
  //
  // this is a hack, and we should stop mutating the array prototype by default 😫
  if (obj === Array.prototype) {
    enumerable = false;
  }

  let value;
  if (desc instanceof Descriptor) {
    value = desc;

    if (EMBER_METAL_ES5_GETTERS || DESCRIPTOR_TRAP) {
      Object.defineProperty(obj, keyName, {
        configurable: true,
        enumerable,
        get: DESCRIPTOR_GETTER_FUNCTION(keyName, value)
      });
    } else if (MANDATORY_SETTER && watching) {
      Object.defineProperty(obj, keyName, {
        configurable: true,
        enumerable,
        writable: true,
        value
      });
    } else if (enumerable === false) {
      Object.defineProperty(obj, keyName, {
        configurable: true,
        writable: true,
        enumerable,
        value
      });
    } else {
      obj[keyName] = value;
    }

    if (EMBER_METAL_ES5_GETTERS) {
      meta.writeDescriptors(keyName, value);
    }

    if (typeof desc.setup === 'function') { desc.setup(obj, keyName); }
  } else if (desc === undefined || desc === null) {
    value = data;

    if (MANDATORY_SETTER && watching) {
      meta.writeValues(keyName, data);

      let defaultDescriptor = {
        configurable: true,
        enumerable,
        set: MANDATORY_SETTER_FUNCTION(keyName),
        get: DEFAULT_GETTER_FUNCTION(keyName)
      };

      Object.defineProperty(obj, keyName, defaultDescriptor);
    } else if ((EMBER_METAL_ES5_GETTERS || DESCRIPTOR_TRAP) && wasDescriptor) {
      Object.defineProperty(obj, keyName, {
        configurable: true,
        enumerable,
        writable: true,
        value
      });
    } else if (enumerable === false) {
      Object.defineProperty(obj, keyName, {
        configurable: true,
        enumerable,
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
