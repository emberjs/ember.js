import CopyableTests from 'ember-runtime/tests/suites/copyable';
import {generateGuid} from 'ember-metal/utils';

CopyableTests.extend({
  name: 'NativeArray Copyable',

  newObject: function() {
    return Ember.A([generateGuid()]);
  },

  isEqual: function(a,b) {
    if (!(a instanceof Array)) return false;
    if (!(b instanceof Array)) return false;
    if (a.length !== b.length) return false;
    return a[0]===b[0];
  },

  shouldBeFreezable: false
}).run();

QUnit.module("NativeArray Copyable");

test("deep copy is respected", function() {
  var array = Ember.A([ { id: 1 }, { id: 2 }, { id: 3 } ]);

  var copiedArray = array.copy(true);

  deepEqual(copiedArray, array, "copied array is equivalent");
  ok(copiedArray[0] !== array[0], "objects inside should be unique");
});
