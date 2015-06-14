import CoreObject from 'ember-runtime/system/core_object';


QUnit.module('Ember.CoreObject');

QUnit.test('works with new (one arg)', function() {
  var obj = new CoreObject({
    firstName: 'Stef',
    lastName: 'Penner'
  });

  equal(obj.firstName, 'Stef');
  equal(obj.lastName, 'Penner');
});

QUnit.test('works with new (> 1 arg)', function() {
  var obj = new CoreObject({
    firstName: 'Stef',
    lastName: 'Penner'
  }, {
    other: 'name'
  });

  equal(obj.firstName, 'Stef');
  equal(obj.lastName, 'Penner');

  equal(obj.other, undefined); // doesn't support multiple pojo' to the constructor
});
