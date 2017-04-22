import CoreObject, { POST_INIT } from '../../system/core_object';
import { set, observer } from 'ember-metal';

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

QUnit.test('[POST_INIT] invoked during construction', function(assert) {
  let callCount = 0;
  let Obj = CoreObject.extend({
    [POST_INIT]() {
      callCount++;
    }
  });

  equal(callCount, 0);

  Obj.create();

  equal(callCount, 1);
});

QUnit.test('[POST_INIT] invoked before finishChains', function(assert) {
  let callCount = 0;

  let Obj = CoreObject.extend({
    [POST_INIT]() {
      set(this, 'hi', 1);
    },

    hiDidChange: observer('hi', function() {
      callCount++;
    })
  });

  equal(callCount, 0);

  let obj = Obj.create();

  equal(callCount, 0);

  set(obj, 'hi', 2);

  equal(callCount, 1);
});
