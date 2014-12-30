import { typeOf } from 'ember-metal/utils';
import Comparable from 'ember-runtime/mixins/comparable';

var TYPE_ORDER = {
  'undefined': 0,
  'null': 1,
  'boolean': 2,
  'number': 3,
  'string': 4,
  'array': 5,
  'object': 6,
  'instance': 7,
  'function': 8,
  'class': 9,
  'date': 10
};

//
// the spaceship operator
//
function spaceship(a, b) {
  var diff = a - b;
  return (diff > 0) - (diff < 0);
}

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
    if (type1 === 'instance' && Comparable.detect(v) && v.constructor.compare) {
      return v.constructor.compare(v, w);
    }

    if (type2 === 'instance' && Comparable.detect(w) && w.constructor.compare) {
      return w.constructor.compare(w, v) * -1;
    }
  }

  var res = spaceship(TYPE_ORDER[type1], TYPE_ORDER[type2]);

  if (res !== 0) {
    return res;
  }

  // types are equal - so we have to check values now
  switch (type1) {
    case 'boolean':
    case 'number':
      return spaceship(v, w);

    case 'string':
      return spaceship(v.localeCompare(w), 0);

    case 'array':
      var vLen = v.length;
      var wLen = w.length;
      var len = Math.min(vLen, wLen);

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
