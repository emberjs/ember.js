import { ENV } from 'ember-environment';
import { decamelize } from '../../../system/string';

QUnit.module('EmberStringUtils.decamelize');

if (!ENV.EXTEND_PROTOTYPES.String) {
  QUnit.test('String.prototype.decamelize is not modified without EXTEND_PROTOTYPES', function() {
    ok('undefined' === typeof String.prototype.decamelize, 'String.prototype helper disabled');
  });
}

QUnit.test('does nothing with normal string', function() {
  deepEqual(decamelize('my favorite items'), 'my favorite items');
  if (ENV.EXTEND_PROTOTYPES.String) {
    deepEqual('my favorite items'.decamelize(), 'my favorite items');
  }
});

QUnit.test('does nothing with dasherized string', function() {
  deepEqual(decamelize('css-class-name'), 'css-class-name');
  if (ENV.EXTEND_PROTOTYPES.String) {
    deepEqual('css-class-name'.decamelize(), 'css-class-name');
  }
});

QUnit.test('does nothing with underscored string', function() {
  deepEqual(decamelize('action_name'), 'action_name');
  if (ENV.EXTEND_PROTOTYPES.String) {
    deepEqual('action_name'.decamelize(), 'action_name');
  }
});

QUnit.test('converts a camelized string into all lower case separated by underscores.', function() {
  deepEqual(decamelize('innerHTML'), 'inner_html');
  if (ENV.EXTEND_PROTOTYPES.String) {
    deepEqual('innerHTML'.decamelize(), 'inner_html');
  }
});

QUnit.test('decamelizes strings with numbers', function() {
  deepEqual(decamelize('size160Url'), 'size160_url');
  if (ENV.EXTEND_PROTOTYPES.String) {
    deepEqual('size160Url'.decamelize(), 'size160_url');
  }
});

QUnit.test('decamelize namespaced classified string', function() {
  deepEqual(decamelize('PrivateDocs/OwnerInvoice'), 'private_docs/owner_invoice');
  if (ENV.EXTEND_PROTOTYPES.String) {
    deepEqual('PrivateDocs/OwnerInvoice'.decamelize(), 'private_docs/owner_invoice');
  }
});

QUnit.test('decamelize namespaced camelized string', function() {
  deepEqual(decamelize('privateDocs/ownerInvoice'), 'private_docs/owner_invoice');
  if (ENV.EXTEND_PROTOTYPES.String) {
    deepEqual('privateDocs/ownerInvoice'.decamelize(), 'private_docs/owner_invoice');
  }
});
