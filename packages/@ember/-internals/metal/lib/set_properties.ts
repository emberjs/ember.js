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
export default function setProperties<TProperties extends { [key: string]: any }>(
  obj: object,
  properties: TProperties
): TProperties {
  if (properties === null || typeof properties !== 'object') {
    return properties;
  }
  changeProperties(() => {
    let props = Object.keys(properties);
    let propertyName;

    for (let i = 0; i < props.length; i++) {
      propertyName = props[i];

      set(obj, propertyName, properties[propertyName]);
    }
  });
  return properties;
}
