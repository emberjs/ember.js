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
export default function getProperties(obj) {
  let ret = {};
  let propertyNames = arguments;
  let i = 1;

  if (arguments.length === 2 && Array.isArray(arguments[1])) {
    i = 0;
    propertyNames = arguments[1];
  }
  for (; i < propertyNames.length; i++) {
    ret[propertyNames[i]] = get(obj, propertyNames[i]);
  }
  return ret;
}
