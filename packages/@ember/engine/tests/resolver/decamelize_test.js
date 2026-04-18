import { module, test } from 'qunit';
import { decamelize } from '@ember/engine/lib/strict-resolver/string';

module('strict-resolver | decamelize', function () {
  test('does nothing with normal string', function (assert) {
    assert.deepEqual(decamelize('my favorite items'), 'my favorite items');
  });

  test('does nothing with dasherized string', function (assert) {
    assert.deepEqual(decamelize('css-class-name'), 'css-class-name');
  });

  test('does nothing with underscored string', function (assert) {
    assert.deepEqual(decamelize('action_name'), 'action_name');
  });

  test('converts a camelized string into all lower case separated by underscores.', function (assert) {
    assert.deepEqual(decamelize('innerHTML'), 'inner_html');
  });

  test('decamelizes strings with numbers', function (assert) {
    assert.deepEqual(decamelize('size160Url'), 'size160_url');
  });

  test('decamelize namespaced classified string', function (assert) {
    assert.deepEqual(decamelize('PrivateDocs/OwnerInvoice'), 'private_docs/owner_invoice');
  });

  test('decamelize namespaced camelized string', function (assert) {
    assert.deepEqual(decamelize('privateDocs/ownerInvoice'), 'private_docs/owner_invoice');
  });
});
