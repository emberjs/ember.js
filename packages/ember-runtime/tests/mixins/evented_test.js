import EventedMixin from '../../mixins/evented';
import CoreObject from '../../system/core_object';

QUnit.module('Ember.Evented');

QUnit.test('works properly on proxy-ish objects', function(assert) {
  let eventedProxyObj = CoreObject.extend(EventedMixin, {
    unknownProperty() {
      return true;
    }
  }).create();

  let noop = function() {};

  eventedProxyObj.on('foo', noop);
  eventedProxyObj.off('foo', noop);

  assert.ok(
    true,
    "An assertion was triggered"
  );
});
