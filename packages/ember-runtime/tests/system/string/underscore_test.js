import { ENV } from 'ember-environment';
import { underscore } from '../../../system/string';

QUnit.module('EmberStringUtils.underscore');

if (!ENV.EXTEND_PROTOTYPES.String) {
  QUnit.test('String.prototype.underscore is not available without EXTEND_PROTOTYPES', function() {
    ok('undefined' === typeof String.prototype.underscore, 'String.prototype helper disabled');
  });
}

QUnit.test('with normal string', function() {
  deepEqual(underscore('my favorite items'), 'my_favorite_items');
  if (ENV.EXTEND_PROTOTYPES.String) {
    deepEqual('my favorite items'.underscore(), 'my_favorite_items');
  }
});

QUnit.test('with dasherized string', function() {
  deepEqual(underscore('css-class-name'), 'css_class_name');
  if (ENV.EXTEND_PROTOTYPES.String) {
    deepEqual('css-class-name'.underscore(), 'css_class_name');
  }
});

QUnit.test('does nothing with underscored string', function() {
  deepEqual(underscore('action_name'), 'action_name');
  if (ENV.EXTEND_PROTOTYPES.String) {
    deepEqual('action_name'.underscore(), 'action_name');
  }
});

QUnit.test('with camelcased string', function() {
  deepEqual(underscore('innerHTML'), 'inner_html');
  if (ENV.EXTEND_PROTOTYPES.String) {
    deepEqual('innerHTML'.underscore(), 'inner_html');
  }
});

QUnit.test('underscore namespaced classified string', function() {
  deepEqual(underscore('PrivateDocs/OwnerInvoice'), 'private_docs/owner_invoice');
  if (ENV.EXTEND_PROTOTYPES.String) {
    deepEqual('PrivateDocs/OwnerInvoice'.underscore(), 'private_docs/owner_invoice');
  }
});

QUnit.test('underscore namespaced camelized string', function() {
  deepEqual(underscore('privateDocs/ownerInvoice'), 'private_docs/owner_invoice');
  if (ENV.EXTEND_PROTOTYPES.String) {
    deepEqual('privateDocs/ownerInvoice'.underscore(), 'private_docs/owner_invoice');
  }
});

QUnit.test('underscore namespaced dasherized string', function() {
  deepEqual(underscore('private-docs/owner-invoice'), 'private_docs/owner_invoice');
  if (ENV.EXTEND_PROTOTYPES.String) {
    deepEqual('private-docs/owner-invoice'.underscore(), 'private_docs/owner_invoice');
  }
});
