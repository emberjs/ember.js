import CopyableTests from 'ember-runtime/tests/suites/copyable';
import Set from "ember-runtime/system/set";
import {generateGuid} from 'ember-metal/utils';
import {get} from 'ember-metal/property_get';

CopyableTests.extend({
  name: 'Ember.Set Copyable',

  newObject() {
    var set, originalCopy;
    ignoreDeprecation(function() {
      set = new Set();
    });

    set.addObject(generateGuid());

    originalCopy = set.copy;
    set.copy = function() {
      var ret;

      ignoreDeprecation(function() {
        ret = originalCopy.apply(set, arguments);
      });

      return ret;
    };

    return set;
  },

  isEqual(a, b) {
    if (!(a instanceof Set)) {
      return false;
    }

    if (!(b instanceof Set)) {
      return false;
    }

    return get(a, 'firstObject') === get(b, 'firstObject');
  },

  shouldBeFreezable: true
}).run();

