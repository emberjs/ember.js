import { module, test } from 'qunit';
import { classify } from '@ember/engine/lib/strict-resolver/string';

module('strict-resolver | classify', function () {
  test('classify normal string', function (assert) {
    assert.deepEqual(classify('my favorite items'), 'MyFavoriteItems');
  });

  test('classify dasherized string', function (assert) {
    assert.deepEqual(classify('css-class-name'), 'CssClassName');
  });

  test('classify underscored string', function (assert) {
    assert.deepEqual(classify('action_name'), 'ActionName');
  });

  test('classify namespaced camelized string', function (assert) {
    assert.deepEqual(classify('privateDocs/ownerInvoice'), 'PrivateDocs/OwnerInvoice');
  });

  test('classify namespaced underscored string', function (assert) {
    assert.deepEqual(classify('private_docs/owner_invoice'), 'PrivateDocs/OwnerInvoice');
  });

  test('classify namespaced dasherized string', function (assert) {
    assert.deepEqual(classify('private-docs/owner-invoice'), 'PrivateDocs/OwnerInvoice');
  });

  test('classify prefixed dasherized string', function (assert) {
    assert.deepEqual(classify('-view-registry'), '_ViewRegistry');
  });

  test('classify namespaced prefixed dasherized string', function (assert) {
    assert.deepEqual(classify('components/-text-field'), 'Components/_TextField');
  });

  test('classify underscore-prefixed underscored string', function (assert) {
    assert.deepEqual(classify('_Foo_Bar'), '_FooBar');
  });

  test('classify underscore-prefixed dasherized string', function (assert) {
    assert.deepEqual(classify('_Foo-Bar'), '_FooBar');
  });

  test('classify underscore-prefixed-namespaced underscore-prefixed string', function (assert) {
    assert.deepEqual(classify('_foo/_bar'), '_Foo/_Bar');
  });

  test('classify dash-prefixed-namespaced underscore-prefixed string', function (assert) {
    assert.deepEqual(classify('-foo/_bar'), '_Foo/_Bar');
  });

  test('classify dash-prefixed-namespaced dash-prefixed string', function (assert) {
    assert.deepEqual(classify('-foo/-bar'), '_Foo/_Bar');
  });

  test('does nothing with classified string', function (assert) {
    assert.deepEqual(classify('InnerHTML'), 'InnerHTML');
  });

  test('does nothing with classified prefixed string', function (assert) {
    assert.deepEqual(classify('_FooBar'), '_FooBar');
  });
});
