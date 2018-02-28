import { getOwner } from 'ember-utils';
import { get } from 'ember-metal';
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

QUnit.test('should not trigger proxy assertion when retrieving a proxy with (GH#16263)', function(assert) {
  let someProxyishThing = CoreObject.extend({
    unknownProperty() {
      return true;
    }
  }).create();

  let obj = new CoreObject({
    someProxyishThing
  });

  let proxy = get(obj, 'someProxyishThing');
  assert.equal(get(proxy, 'lolol'), true, 'should be able to get data from a proxy');
});

QUnit.test('should not trigger proxy assertion when probing for a "symbol"', function(assert) {
  let proxy = CoreObject.extend({
    unknownProperty() {
      return true;
    }
  }).create();

  assert.equal(get(proxy, 'lolol'), true, 'should be able to get data from a proxy');

  // should not trigger an assertion
  getOwner(proxy);
});
