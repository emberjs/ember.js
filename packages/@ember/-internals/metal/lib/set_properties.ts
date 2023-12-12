import { changeProperties } from './property_events';
import { set } from './property_set';
/**
 @module @ember/object
*/
/**
  Set a list of properties on an object. These properties are set inside
  a single `beginPropertyChanges` and `endPropertyChanges` batch, so
  observers will be buffered.

  ```javascript
  import EmberObject from '@ember/object';
  let anObject = EmberObject.create();

  anObject.setProperties({
    firstName: 'Stanley',
    lastName: 'Stuart',
    age: 21
  });
  ```

  @method setProperties
  @static
  @for @ember/object
  @param obj
  @param {Object} properties
  @return properties
  @public
*/
function setProperties<T, K extends keyof T>(obj: T, properties: Pick<T, K>): Pick<T, K>;
function setProperties<T extends Record<string, unknown>>(obj: object, properties: T): T;
function setProperties<K extends string, Hash extends Record<K, unknown>>(
  obj: object,
  properties: Hash
): Hash {
  if (properties === null || typeof properties !== 'object') {
    return properties;
  }
  changeProperties(() => {
    let props = Object.keys(properties);

    for (let propertyName of props) {
      // SAFETY: casting `properties` this way is safe because any object in JS
      // can be indexed this way, and the result will be `unknown`, making it
      // safe for callers.
      set(obj, propertyName, (properties as Record<string, unknown>)[propertyName]);
    }
  });
  return properties;
}

export default setProperties;
