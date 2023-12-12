import { get } from './property_get';
/**
 @module @ember/object
*/

/**
  To get multiple properties at once, call `getProperties`
  with an object followed by a list of strings or an array:

  ```javascript
  import { getProperties } from '@ember/object';

  getProperties(record, 'firstName', 'lastName', 'zipCode');
  // { firstName: 'John', lastName: 'Doe', zipCode: '10011' }
  ```

  is equivalent to:

  ```javascript
  import { getProperties } from '@ember/object';

  getProperties(record, ['firstName', 'lastName', 'zipCode']);
  // { firstName: 'John', lastName: 'Doe', zipCode: '10011' }
  ```

  @method getProperties
  @static
  @for @ember/object
  @param {Object} obj
  @param {String...|Array} list of keys to get
  @return {Object}
  @public
*/

function getProperties<T, K extends keyof T>(obj: T, list: K[]): Pick<T, K>;
function getProperties<T, K extends keyof T>(obj: T, ...list: K[]): Pick<T, K>;
function getProperties<K extends string>(obj: unknown, list: K[]): Record<K, unknown>;
function getProperties<K extends string>(obj: unknown, ...list: K[]): Record<K, unknown>;
function getProperties<K extends string>(
  obj: unknown,
  keys?: Array<K> | Array<Array<K>>
): Record<K, unknown> {
  let ret = {} as Record<K, unknown>;
  let propertyNames: K[];
  let i = 1;

  if (arguments.length === 2 && Array.isArray(keys)) {
    i = 0;
    propertyNames = arguments[1];
  } else {
    propertyNames = Array.from(arguments);
  }

  for (; i < propertyNames.length; i++) {
    // SAFETY: we are just walking the list of property names, so we know the
    // index access never produces `undefined`.
    let name = propertyNames[i] as K;
    ret[name] = get(obj, name);
  }
  return ret;
}

export default getProperties;
