/**
@module @ember/object
*/

import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { descriptorFor, Meta, meta as metaFor, peekMeta, UNDEFINED } from 'ember-meta';
import { overrideChains } from './property_events';

export type MandatorySetterFunction = ((this: object, value: any) => void) & {
  isMandatorySetter: true;
};
export type DefaultGetterFunction = (this: object) => void;
export type InheritingGetterFunction = ((this: object) => void) & {
  isInheritingGetter: true;
};

// ..........................................................
// DESCRIPTOR
//

/**
  Objects of this type can implement an interface to respond to requests to
  get and set. The default implementation handles simple properties.

  @class Descriptor
  @private
*/
export abstract class Descriptor {
  isDescriptor: boolean;
  enumerable: boolean;
  constructor() {
    this.isDescriptor = true;
    this.enumerable = true;
  }

  setup?(obj: object, keyName: string): void;

  abstract teardown(obj: object, keyName: string, meta: Meta): void;
  abstract get(obj: object, keyName: string): any | null | undefined;
  abstract set(obj: object, keyName: string, value: any | null | undefined): any | null | undefined;

  willWatch?(obj: object, keyName: string, meta: Meta): void;
  didUnwatch?(obj: object, keyName: string, meta: Meta): void;

  didChange?(obj: object, keyName: string): void;
}

interface ExtendedObject {
  didDefineProperty?: (obj: object, keyName: string, value: any) => void;
}

// ..........................................................
// DEFINING PROPERTIES API
//

export function MANDATORY_SETTER_FUNCTION(name: string): MandatorySetterFunction {
  function SETTER_FUNCTION(this: object, value: any | undefined | null) {
    let m = peekMeta(this);
    if (!m.isInitialized(this)) {
      m.writeValues(name, value);
    } else {
      assert(
        `You must use set() to set the \`${name}\` property (of ${this}) to \`${value}\`.`,
        false
      );
    }
  }
  return Object.assign(SETTER_FUNCTION as MandatorySetterFunction, { isMandatorySetter: true });
}

export function DEFAULT_GETTER_FUNCTION(name: string): DefaultGetterFunction {
  return function GETTER_FUNCTION(this: any) {
    let meta = peekMeta(this);
    if (meta !== undefined) {
      return meta.peekValues(name);
    }
  };
}

export function INHERITING_GETTER_FUNCTION(name: string): InheritingGetterFunction {
  function IGETTER_FUNCTION(this: any) {
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

  return Object.assign(IGETTER_FUNCTION as InheritingGetterFunction, {
    isInheritingGetter: true,
  });
}

function DESCRIPTOR_GETTER_FUNCTION(name: string, descriptor: Descriptor) {
  return function CPGETTER_FUNCTION(this: object) {
    return descriptor.get(this, name);
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
export function defineProperty(
  obj: object,
  keyName: string,
  desc: Descriptor | undefined | null,
  data?: any | undefined | null,
  meta?: Meta
) {
  if (meta === undefined) {
    meta = metaFor(obj);
  }

  let watching = meta.peekWatching(keyName) > 0;
  let previousDesc = descriptorFor(obj, keyName, meta);
  let wasDescriptor = previousDesc !== undefined;

  if (wasDescriptor) {
    assert(
      `cannot redefine property \`${keyName}\`, it is not configurable`,
      previousDesc.configurable !== false
    );
    previousDesc.teardown(obj, keyName, meta);
    meta.removeDescriptors(keyName);
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

    Object.defineProperty(obj, keyName, {
      configurable: true,
      enumerable,
      get: DESCRIPTOR_GETTER_FUNCTION(keyName, value),
    });

    meta.writeDescriptors(keyName, value);

    if (typeof desc.setup === 'function') {
      desc.setup(obj, keyName);
    }
  } else if (desc === undefined || desc === null) {
    value = data;

    if (DEBUG && watching) {
      meta.writeValues(keyName, data);

      let defaultDescriptor = {
        configurable: true,
        enumerable,
        set: MANDATORY_SETTER_FUNCTION(keyName),
        get: DEFAULT_GETTER_FUNCTION(keyName),
      };

      Object.defineProperty(obj, keyName, defaultDescriptor);
    } else if (wasDescriptor || enumerable === false) {
      Object.defineProperty(obj, keyName, {
        configurable: true,
        enumerable,
        writable: true,
        value,
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
  if (watching) {
    overrideChains(obj, keyName, meta);
  }

  // The `value` passed to the `didDefineProperty` hook is
  // either the descriptor or data, whichever was passed.
  if (typeof (obj as ExtendedObject).didDefineProperty === 'function') {
    (obj as ExtendedObject).didDefineProperty!(obj, keyName, value);
  }
}
