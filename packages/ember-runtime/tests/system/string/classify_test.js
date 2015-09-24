import Ember from 'ember-metal/core';
import {classify} from 'ember-runtime/system/string';

QUnit.module('EmberStringUtils.classify');

if (!Ember.EXTEND_PROTOTYPES && !Ember.EXTEND_PROTOTYPES.String) {
  QUnit.test('String.prototype.classify is not modified without EXTEND_PROTOTYPES', function() {
    ok('undefined' === typeof String.prototype.classify, 'String.prototype helper disabled');
  });
}

QUnit.test('classify normal string', function() {
  deepEqual(classify('my favorite items'), 'MyFavoriteItems');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('my favorite items'.classify(), 'MyFavoriteItems');
  }
});

QUnit.test('classify dasherized string', function() {
  deepEqual(classify('css-class-name'), 'CssClassName');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('css-class-name'.classify(), 'CssClassName');
  }
});

QUnit.test('classify underscored string', function() {
  deepEqual(classify('action_name'), 'ActionName');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('action_name'.classify(), 'ActionName');
  }
});

QUnit.test('does nothing with classified string', function() {
  deepEqual(classify('InnerHTML'), 'InnerHTML');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('InnerHTML'.classify(), 'InnerHTML');
  }
});

QUnit.test('classify namespaced camelized string', function() {
  deepEqual(classify('privateDocs/ownerInvoice'), 'PrivateDocs/OwnerInvoice');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('privateDocs/ownerInvoice'.classify(), 'PrivateDocs/OwnerInvoice');
  }
});

QUnit.test('classify namespaced underscored string', function() {
  deepEqual(classify('private_docs/owner_invoice'), 'PrivateDocs/OwnerInvoice');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('private_docs/owner_invoice'.classify(), 'PrivateDocs/OwnerInvoice');
  }
});

QUnit.test('classify namespaced dasherized string', function() {
  deepEqual(classify('private-docs/owner-invoice'), 'PrivateDocs/OwnerInvoice');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('private-docs/owner-invoice'.classify(), 'PrivateDocs/OwnerInvoice');
  }
});

QUnit.test('classify prefixed dasherized string', function() {
  deepEqual(classify('-view-registry'), '_ViewRegistry');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('-view-registry'.classify(), '_ViewRegistry');
  }
});

QUnit.test('classify namespaced prefixed dasherized string', function() {
  deepEqual(classify('components/-text-field'), 'Components/_TextField');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('components/-text-field'.classify(), 'Components/_TextField');
  }
});

QUnit.test('does nothing with classified prefixed string', function() {
  deepEqual(classify('_FooBar'), '_FooBar');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('_FooBar'.classify(), '_FooBar');
  }
});

QUnit.test('classify underscore-prefixed underscored string', function() {
  deepEqual(classify('_Foo_Bar'), '_FooBar');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('_Foo_Bar'.classify(), '_FooBar');
  }
});

QUnit.test('classify underscore-prefixed dasherized string', function() {
  deepEqual(classify('_Foo-Bar'), '_FooBar');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('_Foo-Bar'.classify(), '_FooBar');
  }
});

QUnit.test('classify underscore-prefixed-namespaced underscore-prefixed string', function() {
  deepEqual(classify('_foo/_bar'), '_Foo/_Bar');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('_foo/_bar'.classify(), '_Foo/_Bar');
  }
});

QUnit.test('classify dash-prefixed-namespaced underscore-prefixed string', function() {
  deepEqual(classify('-foo/_bar'), '_Foo/_Bar');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('-foo/_bar'.classify(), '_Foo/_Bar');
  }
});

QUnit.test('classify dash-prefixed-namespaced dash-prefixed string', function() {
  deepEqual(classify('-foo/-bar'), '_Foo/_Bar');
  if (Ember.EXTEND_PROTOTYPES) {
    deepEqual('-foo/-bar'.classify(), '_Foo/_Bar');
  }
});
