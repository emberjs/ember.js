import { module, test } from 'qunit';
import { underscore } from '@ember/engine/lib/strict-resolver/string';

module('strict-resolver | underscore', function () {
  test('with normal string', function (assert) {
    assert.deepEqual(underscore('my favorite items'), 'my_favorite_items');
  });

  test('with dasherized string', function (assert) {
    assert.deepEqual(underscore('css-class-name'), 'css_class_name');
  });

  test('does nothing with underscored string', function (assert) {
    assert.deepEqual(underscore('action_name'), 'action_name');
  });

  test('with camelcased string', function (assert) {
    assert.deepEqual(underscore('innerHTML'), 'inner_html');
  });

  test('underscore namespaced classified string', function (assert) {
    assert.deepEqual(underscore('PrivateDocs/OwnerInvoice'), 'private_docs/owner_invoice');
  });

  test('underscore namespaced camelized string', function (assert) {
    assert.deepEqual(underscore('privateDocs/ownerInvoice'), 'private_docs/owner_invoice');
  });

  test('underscore namespaced dasherized string', function (assert) {
    assert.deepEqual(underscore('private-docs/owner-invoice'), 'private_docs/owner_invoice');
  });
});
