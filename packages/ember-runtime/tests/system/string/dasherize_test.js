import { ENV } from 'ember-environment';
import { dasherize } from '../../../system/string';

QUnit.module('EmberStringUtils.dasherize');

if (!ENV.EXTEND_PROTOTYPES.String) {
  QUnit.test('String.prototype.dasherize is not modified without EXTEND_PROTOTYPES', function() {
    ok('undefined' === typeof String.prototype.dasherize, 'String.prototype helper disabled');
  });
}

QUnit.test('dasherize normal string', function() {
  deepEqual(dasherize('my favorite items'), 'my-favorite-items');
  if (ENV.EXTEND_PROTOTYPES.String) {
    deepEqual('my favorite items'.dasherize(), 'my-favorite-items');
  }
});

QUnit.test('does nothing with dasherized string', function() {
  deepEqual(dasherize('css-class-name'), 'css-class-name');
  if (ENV.EXTEND_PROTOTYPES.String) {
    deepEqual('css-class-name'.dasherize(), 'css-class-name');
  }
});

QUnit.test('dasherize underscored string', function() {
  deepEqual(dasherize('action_name'), 'action-name');
  if (ENV.EXTEND_PROTOTYPES.String) {
    deepEqual('action_name'.dasherize(), 'action-name');
  }
});

QUnit.test('dasherize camelcased string', function() {
  deepEqual(dasherize('innerHTML'), 'inner-html');
  if (ENV.EXTEND_PROTOTYPES.String) {
    deepEqual('innerHTML'.dasherize(), 'inner-html');
  }
});

QUnit.test('dasherize string that is the property name of Object.prototype', function() {
  deepEqual(dasherize('toString'), 'to-string');
  if (ENV.EXTEND_PROTOTYPES.String) {
    deepEqual('toString'.dasherize(), 'to-string');
  }
});

QUnit.test('dasherize namespaced classified string', function() {
  deepEqual(dasherize('PrivateDocs/OwnerInvoice'), 'private-docs/owner-invoice');
  if (ENV.EXTEND_PROTOTYPES.String) {
    deepEqual('PrivateDocs/OwnerInvoice'.dasherize(), 'private-docs/owner-invoice');
  }
});

QUnit.test('dasherize namespaced camelized string', function() {
  deepEqual(dasherize('privateDocs/ownerInvoice'), 'private-docs/owner-invoice');
  if (ENV.EXTEND_PROTOTYPES.String) {
    deepEqual('privateDocs/ownerInvoice'.dasherize(), 'private-docs/owner-invoice');
  }
});

QUnit.test('dasherize namespaced underscored string', function() {
  deepEqual(dasherize('private_docs/owner_invoice'), 'private-docs/owner-invoice');
  if (ENV.EXTEND_PROTOTYPES.String) {
    deepEqual('private_docs/owner_invoice'.dasherize(), 'private-docs/owner-invoice');
  }
});
