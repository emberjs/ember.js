import Ember from 'ember-metal/core';  // for Ember.ORDER_DEFINITION
import { typeOf } from 'ember-metal/utils';
import Comparable from 'ember-runtime/mixins/comparable';

// Used by Ember.compare
Ember.ORDER_DEFINITION = Ember.ENV.ORDER_DEFINITION || [
  'undefined',
  'null',
  'boolean',
  'number',
  'string',
  'array',
  'object',
  'instance',
  'function',
  'class',
  'date'
];

//
// the spaceship operator
//
var spaceship = function(a, b) {
  var diff = a - b;
  return (diff > 0) - (diff < 0);
};

/**
 This will compare two javascript values of possibly different types.
 It will tell you which one is greater than the other by returning:

  - -1 if the first is smaller than the second,
  - 0 if both are equal,
  - 1 if the first is greater than the second.

 The order is calculated based on `Ember.ORDER_DEFINITION`, if types are different.
 In case they have the same type an appropriate comparison for this type is made.

  ```javascript
  Ember.compare('hello', 'hello');  // 0
  Ember.compare('abc', 'dfg');      // -1
  Ember.compare(2, 1);              // 1
  ```

 @method compare
 @for Ember
 @param {Object} v First value to compare
 @param {Object} w Second value to compare
 @return {Number} -1 if v < w, 0 if v = w and 1 if v > w.
*/
export default function compare(v, w) {
  if (v === w) { 
    return 0; 
  }

  var type1 = typeOf(v);
  var type2 = typeOf(w);

  if (Comparable) {
    if (type1 ==='instance' && Comparable.detect(v.constructor)) {
      return v.constructor.compare(v, w);
    }

    if (type2 === 'instance' && Comparable.detect(w.constructor)) {
      return 1 - w.constructor.compare(w, v);
    }
  }

  // If we haven't yet generated a reverse-mapping of Ember.ORDER_DEFINITION,
  // do so now.
  var mapping = Ember.ORDER_DEFINITION_MAPPING;

  if (!mapping) {
    var order = Ember.ORDER_DEFINITION;

    mapping = Ember.ORDER_DEFINITION_MAPPING = {};

    for (var idx = 0; idx < order.length; idx++) {
      mapping[order[idx]] = idx;
    }

    // We no longer need Ember.ORDER_DEFINITION.
    delete Ember.ORDER_DEFINITION;
  }

  var res = spaceship(mapping[type1], mapping[type2]);
  if (res !== 0) {
    return res;
  }

  // types are equal - so we have to check values now
  switch (type1) {
    case 'boolean':
    case 'number':
      return spaceship(v,w);

    case 'string':
      return spaceship(v.localeCompare(w), 0);

    case 'array':
      var vLen = v.length,
          wLen = w.length,
          len = Math.min(vLen, wLen);

      for (var i = 0; i < len; i++) {
        var r = compare(v[i], w[i]);
        if (r !== 0) {
          return r;
        }
      }

      // all elements are equal now
      // shorter array should be ordered first
      return spaceship(vLen, wLen);

    case 'instance':
      if (Comparable && Comparable.detect(v)) {
        return v.compare(v, w);
      }
      return 0;

    case 'date':
      return spaceship(v.getTime(), w.getTime());

    default:
      return 0;
  }
}
