import assign from 'ember-metal/assign';
import isEnabled from 'ember-metal/features';

QUnit.module('Ember.assign');

if (isEnabled('ember-metal-ember-assign')) {
  QUnit.test('Ember.assign', function() {
    var a = { a: 1 };
    var b = { b: 2 };
    var c = { c: 3 };
    var a2 = { a: 4 };

    assign(a, b, c, a2);

    deepEqual(a, { a: 4, b: 2, c: 3 });
    deepEqual(b, { b: 2 });
    deepEqual(c, { c: 3 });
    deepEqual(a2, { a: 4 });
  });
}
