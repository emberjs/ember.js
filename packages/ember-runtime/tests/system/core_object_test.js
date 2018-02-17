import CoreObject from '../../system/core_object';

QUnit.module('Ember.CoreObject');

QUnit.test('works with new (one arg)', function(assert) {
  let obj = new CoreObject({
    firstName: 'Stef',
    lastName: 'Penner'
  });

  assert.equal(obj.firstName, 'Stef');
  assert.equal(obj.lastName, 'Penner');
});

QUnit.test('works with new (> 1 arg)', function(assert) {
  let obj = new CoreObject({
    firstName: 'Stef',
    lastName: 'Penner'
  }, {
    other: 'name'
  });

  assert.equal(obj.firstName, 'Stef');
  assert.equal(obj.lastName, 'Penner');

  assert.equal(obj.other, undefined); // doesn't support multiple pojo' to the constructor
});

QUnit.test('toString should be not be added as a property when calling toString()', function(assert) {
  let obj = new CoreObject({
    firstName: 'Foo',
    lastName: 'Bar'
  });

  obj.toString();

  assert.notOk(obj.hasOwnProperty('toString'), 'Calling toString() should not create a toString class property');
});
