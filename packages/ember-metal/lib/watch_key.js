import { lookupDescriptor } from 'ember-utils';
import { DEBUG } from '@glimmer/env';
import { descriptorFor, isDescriptor, meta as metaFor, peekMeta, UNDEFINED } from './meta';
import {
  MANDATORY_SETTER_FUNCTION,
  DEFAULT_GETTER_FUNCTION,
  INHERITING_GETTER_FUNCTION,
} from './properties';

let handleMandatorySetter;

export function watchKey(obj, keyName, _meta) {
  let meta = _meta === undefined ? metaFor(obj) : _meta;
  let count = meta.peekWatching(keyName) || 0;
  meta.writeWatching(keyName, count + 1);

  if (count === 0) {
    // activate watching first time
    let possibleDesc = descriptorFor(obj, keyName, meta);

    if (possibleDesc !== undefined && possibleDesc.willWatch) {
      possibleDesc.willWatch(obj, keyName, meta);
    }

    if (typeof obj.willWatchProperty === 'function') {
      obj.willWatchProperty(keyName);
    }

    if (DEBUG) {
      // NOTE: this is dropped for prod + minified builds
      handleMandatorySetter(meta, obj, keyName);
    }
  }
}

if (DEBUG) {
  let hasOwnProperty = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);
  let propertyIsEnumerable = (obj, key) => Object.prototype.propertyIsEnumerable.call(obj, key);

  // Future traveler, although this code looks scary. It merely exists in
  // development to aid in development asertions. Production builds of
  // ember strip this entire block out
  handleMandatorySetter = function handleMandatorySetter(m, obj, keyName) {
    let descriptor = lookupDescriptor(obj, keyName);
    let hasDescriptor = descriptor !== null;
    let possibleDesc = hasDescriptor && descriptor.value;
    if (isDescriptor(possibleDesc)) {
      return;
    }
    let configurable = hasDescriptor ? descriptor.configurable : true;
    let isWritable = hasDescriptor ? descriptor.writable : true;
    let hasValue = hasDescriptor ? 'value' in descriptor : true;

    // this x in Y deopts, so keeping it in this function is better;
    if (configurable && isWritable && hasValue && keyName in obj) {
      let desc = {
        configurable: true,
        set: MANDATORY_SETTER_FUNCTION(keyName),
        enumerable: propertyIsEnumerable(obj, keyName),
        get: undefined,
      };

      if (hasOwnProperty(obj, keyName)) {
        m.writeValues(keyName, obj[keyName]);
        desc.get = DEFAULT_GETTER_FUNCTION(keyName);
      } else {
        desc.get = INHERITING_GETTER_FUNCTION(keyName);
      }

      Object.defineProperty(obj, keyName, desc);
    }
  };
}

export function unwatchKey(obj, keyName, _meta) {
  let meta = _meta === undefined ? peekMeta(obj) : _meta;

  // do nothing of this object has already been destroyed
  if (meta === undefined || meta.isSourceDestroyed()) {
    return;
  }

  let count = meta.peekWatching(keyName);
  if (count === 1) {
    meta.writeWatching(keyName, 0);

    let possibleDesc = descriptorFor(obj, keyName, meta);
    let isDescriptor = possibleDesc !== undefined;

    if (isDescriptor && possibleDesc.didUnwatch) {
      possibleDesc.didUnwatch(obj, keyName, meta);
    }

    if (typeof obj.didUnwatchProperty === 'function') {
      obj.didUnwatchProperty(keyName);
    }

    if (DEBUG) {
      // It is true, the following code looks quite WAT. But have no fear, It
      // exists purely to improve development ergonomics and is removed from
      // ember.min.js and ember.prod.js builds.
      //
      // Some further context: Once a property is watched by ember, bypassing `set`
      // for mutation, will bypass observation. This code exists to assert when
      // that occurs, and attempt to provide more helpful feedback. The alternative
      // is tricky to debug partially observable properties.
      if (!isDescriptor && keyName in obj) {
        let maybeMandatoryDescriptor = lookupDescriptor(obj, keyName);

        if (maybeMandatoryDescriptor.set && maybeMandatoryDescriptor.set.isMandatorySetter) {
          if (maybeMandatoryDescriptor.get && maybeMandatoryDescriptor.get.isInheritingGetter) {
            let possibleValue = meta.readInheritedValue('values', keyName);
            if (possibleValue === UNDEFINED) {
              delete obj[keyName];
              return;
            }
          }

          Object.defineProperty(obj, keyName, {
            configurable: true,
            enumerable: Object.prototype.propertyIsEnumerable.call(obj, keyName),
            writable: true,
            value: meta.peekValues(keyName),
          });
          meta.deleteFromValues(keyName);
        }
      }
    }
  } else if (count > 1) {
    meta.writeWatching(keyName, count - 1);
  }
}
