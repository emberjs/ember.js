import EmberObject from '@ember/object';
import FooMixin from 'my-app/mixins/foo';
import { module, test } from 'qunit';

module('Unit | Mixin | foo', function() {
  // Replace this with your real tests.
  test('it works', function (assert) {
    let FooObject = EmberObject.extend(FooMixin);
    let subject = FooObject.create();
    assert.ok(subject);
  });
});
