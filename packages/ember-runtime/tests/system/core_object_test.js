import CoreObject from 'ember-runtime/system/core_object';


QUnit.module('Ember.CoreObject');

QUnit.test('works with new (one arg)', function() {
  let obj = new CoreObject({
    firstName: 'Stef',
    lastName: 'Penner'
  });

  equal(obj.firstName, 'Stef');
  equal(obj.lastName, 'Penner');
});

QUnit.test('works with new (> 1 arg)', function() {
  let obj = new CoreObject({
    firstName: 'Stef',
    lastName: 'Penner'
  }, {
    other: 'name'
  });

  equal(obj.firstName, 'Stef');
  equal(obj.lastName, 'Penner');

  equal(obj.other, undefined); // doesn't support multiple pojo' to the constructor
});

QUnit.test('toString should be not be added as a property when calling toString()', function() {
  let obj = new CoreObject({
    firstName: 'Foo',
    lastName: 'Bar'
  });

  obj.toString();

  notOk(obj.hasOwnProperty('toString'), 'Calling toString() should not create a toString class property');
});
