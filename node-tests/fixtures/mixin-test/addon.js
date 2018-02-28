import EmberObject from '@ember/object';
import FooMixin from 'my-addon/mixins/foo';
import { module, test } from 'qunit';

module('Unit | Mixin | foo');

// Replace this with your real tests.
test('it works', function(assert) {
  let FooObject = EmberObject.extend(FooMixin);
  let subject = FooObject.create();
  assert.ok(subject);
});
