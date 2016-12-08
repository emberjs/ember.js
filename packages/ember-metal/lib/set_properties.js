import { changeProperties } from './property_events';
import { set } from './property_set';

/**
  Set a list of properties on an object. These properties are set inside
  a single `beginPropertyChanges` and `endPropertyChanges` batch, so
  observers will be buffered.

  ```javascript
  let anObject = Ember.Object.create();

  anObject.setProperties({
    firstName: 'Stanley',
    lastName: 'Stuart',
    age: 21
  });
  ```

  @method setProperties
  @param obj
  @param {Object} properties
  @return properties
  @public
*/
export default function setProperties(obj, properties) {
  if (!properties || typeof properties !== 'object') { return properties; }
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
