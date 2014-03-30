require('ember-metal/property_get');
require('ember-metal/utils');

var get = Ember.get;

/**
  To get multiple properties at once, call `Ember.getProperties`
  with an object followed by a list of strings or an array:

  ```javascript
  Ember.getProperties(record, 'firstName', 'lastName', 'zipCode');
  // { firstName: 'John', lastName: 'Doe', zipCode: '10011' }
  ```

  is equivalent to:

  ```javascript
  Ember.getProperties(record, ['firstName', 'lastName', 'zipCode']);
  // { firstName: 'John', lastName: 'Doe', zipCode: '10011' }
  ```

  @method getProperties
  @param obj
  @param {String...|Array} list of keys to get
  @return {Hash}
*/
Ember.getProperties = function(obj) {
  var ret = {},
      propertyNames = arguments,
      i = 1;

  if (arguments.length === 2 && Ember.typeOf(arguments[1]) === 'array') {
    i = 0;
    propertyNames = arguments[1];
  }
  for(var len = propertyNames.length; i < len; i++) {
    ret[propertyNames[i]] = get(obj, propertyNames[i]);
  }
  return ret;
};
