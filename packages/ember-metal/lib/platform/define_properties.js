import { defineProperty } from 'ember-metal/platform/define_property';

var defineProperties = Object.defineProperties;

// ES5 15.2.3.7
// http://es5.github.com/#x15.2.3.7
if (!defineProperties) {
  defineProperties = function defineProperties(object, properties) {
    for (var property in properties) {
      if (properties.hasOwnProperty(property) && property !== "__proto__") {
        defineProperty(object, property, properties[property]);
      }
    }
    return object;
  };

  Object.defineProperties = defineProperties;
}

export default defineProperties;
