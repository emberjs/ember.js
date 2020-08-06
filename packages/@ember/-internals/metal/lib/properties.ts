/**
@module @ember/object
*/

import { Meta, meta as metaFor } from '@ember/-internals/meta';
import { setWithMandatorySetter } from '@ember/-internals/utils';
import { DEBUG } from '@glimmer/env';
import { Decorator, descriptorForProperty, isClassicDecorator } from './decorator';
import { revalidateObservers } from './observer';

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
  _meta?: Meta
): void {
  let meta = _meta === undefined ? metaFor(obj) : _meta;
  let previousDesc = descriptorForProperty(obj, keyName, meta);
  let wasDescriptor = previousDesc !== undefined;

  if (wasDescriptor) {
    previousDesc.teardown(obj, keyName, meta);
  }

  if (isClassicDecorator(desc)) {
    defineDecorator(obj, keyName, desc!, meta);
  } else if (desc === null || desc === undefined) {
    defineValue(obj, keyName, data, wasDescriptor, true);
  } else {
    // fallback to ES5
    Object.defineProperty(obj, keyName, desc);
  }

  // if key is being watched, override chains that
  // were initialized with the prototype
  if (!meta.isPrototypeMeta(obj)) {
    revalidateObservers(obj);
  }
}

export function defineDecorator(obj: object, keyName: string, desc: Decorator, meta: Meta) {
  let propertyDesc;

  if (DEBUG) {
    propertyDesc = desc!(obj, keyName, undefined, meta, true);
  } else {
    propertyDesc = desc!(obj, keyName, undefined, meta);
  }

  Object.defineProperty(obj, keyName, propertyDesc as PropertyDescriptor);

  // pass the decorator function forward for backwards compat
  return desc;
}

export function defineValue(
  obj: object,
  keyName: string,
  value: unknown,
  wasDescriptor: boolean,
  enumerable = true
) {
  if (wasDescriptor === true || enumerable === false) {
    Object.defineProperty(obj, keyName, {
      configurable: true,
      enumerable,
      writable: true,
      value,
    });
  } else {
    if (DEBUG) {
      setWithMandatorySetter!(obj, keyName, value);
    } else {
      obj[keyName] = value;
    }
  }

  return value;
}
