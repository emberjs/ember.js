import CoreObject, { POST_INIT } from '../../system/core_object';
import { set, observer } from 'ember-metal';

QUnit.module('Ember.CoreObject');

QUnit.test('works with new (one arg)', function() {
  expectDeprecation(() => {
    let obj = new CoreObject({
      firstName: 'Stef',
      lastName: 'Penner'
    });
  }, /using `new` with Ember.Object has been deprecated/);
});

QUnit.test('works with new (> 1 arg)', function() {
  expectDeprecation(() => {
    new CoreObject(
      {
        firstName: 'Stef',
        lastName: 'Penner',
      },
      {
        other: 'name',
      }
    );
  }, /using `new` with Ember.Object has been deprecated/);
});

QUnit.test('toString should be not be added as a property when calling toString()', function() {
  let obj = CoreObject.create({
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
