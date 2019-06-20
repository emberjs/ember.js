/**
@module @ember/object
*/

import { Meta, meta as metaFor, peekMeta, UNDEFINED } from '@ember/-internals/meta';
import { setWithMandatorySetter } from '@ember/-internals/utils';
import { EMBER_METAL_TRACKED_PROPERTIES } from '@ember/canary-features';
import { assert } from '@ember/debug';
import { DEBUG } from '@glimmer/env';
import { Decorator } from './decorator';
import { descriptorForProperty, isClassicDecorator } from './descriptor_map';
import { overrideChains } from './property_events';

export type MandatorySetterFunction = ((this: object, value: any) => void) & {
  isMandatorySetter: true;
};
export type DefaultGetterFunction = (this: object) => void;
export type InheritingGetterFunction = ((this: object) => void) & {
  isInheritingGetter: true;
};

interface ExtendedObject {
  didDefineProperty?: (obj: object, keyName: string, value: any) => void;
}

// ..........................................................
// DEFINING PROPERTIES API
//

export function MANDATORY_SETTER_FUNCTION(name: string): MandatorySetterFunction {
  function SETTER_FUNCTION(this: object, value: any | undefined | null): void {
    let m = peekMeta(this)!;
    if (m.isInitializing() || m.isPrototypeMeta(this)) {
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
  return function GETTER_FUNCTION(this: any): void {
    let meta = peekMeta(this);
    if (meta !== null) {
      return meta.peekValues(name);
    }
  };
}

export function INHERITING_GETTER_FUNCTION(name: string): InheritingGetterFunction {
  function IGETTER_FUNCTION(this: any): void {
    let meta = peekMeta(this);
    let val;
    if (meta !== null) {
      val = meta.readInheritedValue(name);
      if (val === undefined) {
        let proto = Object.getPrototypeOf(this);
        val = proto === null ? undefined : proto[name];
      } else {
        val = val === UNDEFINED ? undefined : val;
      }
    }

    return val;
  }

  return Object.assign(IGETTER_FUNCTION as InheritingGetterFunction, {
    isInheritingGetter: true,
  });
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

  @public
  @method defineProperty
  @static
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
  desc?: Decorator | undefined | null,
  data?: any | undefined | null,
  meta?: Meta
): void {
  if (meta === undefined) {
    meta = metaFor(obj);
  }

  let watching = meta.peekWatching(keyName) > 0;
  let previousDesc = descriptorForProperty(obj, keyName, meta);
  let wasDescriptor = previousDesc !== undefined;

  if (wasDescriptor) {
    previousDesc.teardown(obj, keyName, meta);
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
  if (isClassicDecorator(desc)) {
    let propertyDesc;

    if (DEBUG) {
      propertyDesc = desc!(obj, keyName, undefined, meta, true);
    } else {
      propertyDesc = desc!(obj, keyName, undefined, meta);
    }

    Object.defineProperty(obj, keyName, propertyDesc as PropertyDescriptor);

    // pass the decorator function forward for backwards compat
    value = desc;
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
      if (EMBER_METAL_TRACKED_PROPERTIES && DEBUG) {
        setWithMandatorySetter!(obj, keyName, data);
      } else {
        obj[keyName] = data;
      }
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
