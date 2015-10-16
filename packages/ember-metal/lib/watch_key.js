import isEnabled from 'ember-metal/features';
import {
  meta as metaFor,
  peekMeta
} from 'ember-metal/meta';
import {
  MANDATORY_SETTER_FUNCTION,
  DEFAULT_GETTER_FUNCTION
} from 'ember-metal/properties';

let handleMandatorySetter, lookupDescriptor;

export function watchKey(obj, keyName, meta) {
  // can't watch length on Array - it is special...
  if (keyName === 'length' && Array.isArray(obj)) { return; }

  let m = meta || metaFor(obj);

  // activate watching first time
  if (!m.peekWatching(keyName)) {
    m.writeWatching(keyName, 1);

    let possibleDesc = obj[keyName];
    let desc = (possibleDesc !== null && typeof possibleDesc === 'object' && possibleDesc.isDescriptor) ? possibleDesc : undefined;
    if (desc && desc.willWatch) { desc.willWatch(obj, keyName); }

    if ('function' === typeof obj.willWatchProperty) {
      obj.willWatchProperty(keyName);
    }

    if (isEnabled('mandatory-setter')) {
      handleMandatorySetter(m, obj, keyName);
    }
  } else {
    m.writeWatching(keyName, (m.peekWatching(keyName) || 0) + 1);
  }
}


if (isEnabled('mandatory-setter')) {
  lookupDescriptor = function lookupDescriptor(obj, keyName) {
    let current = obj;
    while (current) {
      let descriptor = Object.getOwnPropertyDescriptor(current, keyName);

      if (descriptor) {
        return descriptor;
      }

      current = Object.getPrototypeOf(current);
    }

    return null;
  };

  handleMandatorySetter = function handleMandatorySetter(m, obj, keyName) {
    let descriptor = lookupDescriptor(obj, keyName);
    let configurable = descriptor ? descriptor.configurable : true;
    let isWritable = descriptor ? descriptor.writable : true;
    let hasValue = descriptor ? 'value' in descriptor : true;
    let possibleDesc = descriptor && descriptor.value;
    let isDescriptor = possibleDesc !== null && typeof possibleDesc === 'object' && possibleDesc.isDescriptor;

    if (isDescriptor) { return; }

    // this x in Y deopts, so keeping it in this function is better;
    if (configurable && isWritable && hasValue && keyName in obj) {
      m.writeValues(keyName, obj[keyName]);
      Object.defineProperty(obj, keyName, {
        configurable: true,
        enumerable: Object.prototype.propertyIsEnumerable.call(obj, keyName),
        set: MANDATORY_SETTER_FUNCTION(keyName),
        get: DEFAULT_GETTER_FUNCTION(keyName)
      });
    }
  };
}

export function unwatchKey(obj, keyName, meta) {
  let m = meta || peekMeta(obj);
  let count = m && m.peekWatching(keyName);

  if (count === 1) {
    m.writeWatching(keyName, 0);

    let possibleDesc = obj[keyName];
    let desc = (possibleDesc !== null && typeof possibleDesc === 'object' && possibleDesc.isDescriptor) ? possibleDesc : undefined;
    if (desc && desc.didUnwatch) { desc.didUnwatch(obj, keyName); }

    if ('function' === typeof obj.didUnwatchProperty) {
      obj.didUnwatchProperty(keyName);
    }

    if (isEnabled('mandatory-setter')) {
      if (!desc && keyName in obj) {
        Object.defineProperty(obj, keyName, {
          configurable: true,
          enumerable: Object.prototype.propertyIsEnumerable.call(obj, keyName),
          set(val) {
            // redefine to set as enumerable
            Object.defineProperty(obj, keyName, {
              configurable: true,
              writable: true,
              enumerable: true,
              value: val
            });

            let m = peekMeta(obj);

            if (m) {
              m.deleteFromValues(keyName);
            }
          },
          get: DEFAULT_GETTER_FUNCTION(keyName)
        });
      }
    }
  } else if (count > 1) {
    m = m || metaFor(obj);
    m.writeWatching(keyName, count - 1);
  }
}
