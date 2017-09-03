import { ENV } from 'ember-environment';
import { underscore } from '../../../system/string';

QUnit.module('EmberStringUtils.underscore');

if (!ENV.EXTEND_PROTOTYPES.String) {
  QUnit.test('String.prototype.underscore is not available without EXTEND_PROTOTYPES', function() {
    ok('undefined' === typeof String.prototype.underscore, 'String.prototype helper disabled');
  });
}

function test(given, expected, description) {
  QUnit.test(description, function() {
    deepEqual(underscore(given), expected);
    if (ENV.EXTEND_PROTOTYPES.String) {
      deepEqual(given.underscore(), expected);
    }
  });
}

test('my favorite items',          'my_favorite_items',          'with normal string');
test('css-class-name',             'css_class_name',             'with dasherized string');
test('action_name',                'action_name',                'does nothing with underscored string');
test('innerHTML',                  'inner_html',                 'with camelcased string');
test('PrivateDocs/OwnerInvoice',   'private_docs/owner_invoice', 'underscore namespaced classified string');
test('privateDocs/ownerInvoice',   'private_docs/owner_invoice', 'underscore namespaced camelized string');
test('private-docs/owner-invoice', 'private_docs/owner_invoice', 'underscore namespaced dasherized string');
