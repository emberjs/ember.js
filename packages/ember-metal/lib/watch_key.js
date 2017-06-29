import { lookupDescriptor } from 'ember-utils';
import { MANDATORY_SETTER } from 'ember/features';
import {
  meta as metaFor,
  peekMeta,
  UNDEFINED
} from './meta';
import {
  MANDATORY_SETTER_FUNCTION,
  DEFAULT_GETTER_FUNCTION,
  INHERITING_GETTER_FUNCTION
} from './properties';

let handleMandatorySetter;

export function watchKey(obj, keyName, meta) {
  if (typeof obj !== 'object' || obj === null) { return; }

  let m = meta || metaFor(obj);
  let count = m.peekWatching(keyName) || 0;
  m.writeWatching(keyName, count + 1);

  if (count === 0) { // activate watching first time
    let possibleDesc = obj[keyName];
    let isDescriptor = possibleDesc !== null &&
      typeof possibleDesc === 'object' && possibleDesc.isDescriptor;
    if (isDescriptor && possibleDesc.willWatch) { possibleDesc.willWatch(obj, keyName); }

    if ('function' === typeof obj.willWatchProperty) {
      obj.willWatchProperty(keyName);
    }

    if (MANDATORY_SETTER) {
      // NOTE: this is dropped for prod + minified builds
      handleMandatorySetter(m, obj, keyName);
    }
  }
}


if (MANDATORY_SETTER) {
  let hasOwnProperty = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

  let propertyIsEnumerable = (obj, key) => Object.prototype.propertyIsEnumerable.call(obj, key);

  // Future traveler, although this code looks scary. It merely exists in
  // development to aid in development asertions. Production builds of
  // ember strip this entire block out
  handleMandatorySetter = function handleMandatorySetter(m, obj, keyName) {
    let descriptor = lookupDescriptor(obj, keyName);
    let configurable = descriptor ? descriptor.configurable : true;
    let isWritable = descriptor ? descriptor.writable : true;
    let hasValue = descriptor ? 'value' in descriptor : true;
    let possibleDesc = descriptor && descriptor.value;
    let isDescriptor = possibleDesc !== null &&
                       typeof possibleDesc === 'object' &&
                       possibleDesc.isDescriptor;

    if (isDescriptor) { return; }

    // this x in Y deopts, so keeping it in this function is better;
    if (configurable && isWritable && hasValue && keyName in obj) {
      let desc = {
        configurable: true,
        set: MANDATORY_SETTER_FUNCTION(keyName),
        enumerable: propertyIsEnumerable(obj, keyName),
        get: undefined
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
  if (typeof obj !== 'object' || obj === null) {
    return;
  }
  let meta = _meta || peekMeta(obj);

  // do nothing of this object has already been destroyed
  if (!meta || meta.isSourceDestroyed()) { return; }

  let count = meta.peekWatching(keyName);
  if (count === 1) {
    meta.writeWatching(keyName, 0);

    let possibleDesc = obj[keyName];
    let isDescriptor = possibleDesc !== null &&
      typeof possibleDesc === 'object' && possibleDesc.isDescriptor;

    if (isDescriptor && possibleDesc.didUnwatch) { possibleDesc.didUnwatch(obj, keyName); }

    if ('function' === typeof obj.didUnwatchProperty) {
      obj.didUnwatchProperty(keyName);
    }

    if (MANDATORY_SETTER) {
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
            value: meta.peekValues(keyName)
          });
          meta.deleteFromValues(keyName);
        }
      }
    }
  } else if (count > 1) {
    meta.writeWatching(keyName, count - 1);
  }
}
