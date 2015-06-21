import { changeProperties } from 'ember-metal/property_events';
import { set } from 'ember-metal/property_set';

/**
  Set a list of properties on an object. These properties are set inside
  a single `beginPropertyChanges` and `endPropertyChanges` batch, so
  observers will be buffered.

  ```javascript
  var anObject = Ember.Object.create();

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
    var props = Object.keys(properties);
    var propertyName;

    for (var i = 0, l = props.length; i < l; i++) {
      propertyName = props[i];

      set(obj, propertyName, properties[propertyName]);
    }
  });
  return properties;
}
