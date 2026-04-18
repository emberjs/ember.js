import { module, test } from 'qunit';
import { dasherize } from '@ember/engine/lib/strict-resolver/string';

module('strict-resolver | dasherize', function () {
  test('dasherize normal string', function (assert) {
    assert.deepEqual(dasherize('my favorite items'), 'my-favorite-items');
  });

  test('does nothing with dasherized string', function (assert) {
    assert.deepEqual(dasherize('css-class-name'), 'css-class-name');
  });

  test('dasherize underscored string', function (assert) {
    assert.deepEqual(dasherize('action_name'), 'action-name');
  });

  test('dasherize camelcased string', function (assert) {
    assert.deepEqual(dasherize('innerHTML'), 'inner-html');
  });

  test('dasherize string that is the property name of Object.prototype', function (assert) {
    assert.deepEqual(dasherize('toString'), 'to-string');
  });

  test('dasherize namespaced classified string', function (assert) {
    assert.deepEqual(dasherize('PrivateDocs/OwnerInvoice'), 'private-docs/owner-invoice');
  });

  test('dasherize namespaced camelized string', function (assert) {
    assert.deepEqual(dasherize('privateDocs/ownerInvoice'), 'private-docs/owner-invoice');
  });

  test('dasherize namespaced underscored string', function (assert) {
    assert.deepEqual(dasherize('private_docs/owner_invoice'), 'private-docs/owner-invoice');
  });
});
