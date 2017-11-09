import { ENV } from 'ember-environment';
import { camelize } from '../../../system/string';

QUnit.module('EmberStringUtils.camelize');

if (!ENV.EXTEND_PROTOTYPES.String) {
  QUnit.test('String.prototype.camelize is not modified without EXTEND_PROTOTYPES', function() {
    ok('undefined' === typeof String.prototype.camelize, 'String.prototype helper disabled');
  });
}

function test(given, expected, description) {
  QUnit.test(description, function() {
    deepEqual(camelize(given), expected);
    if (ENV.EXTEND_PROTOTYPES.String) {
      deepEqual(given.camelize(), expected);
    }
  });
}

test('my favorite items',          'myFavoriteItems',          'camelize normal string');
test('I Love Ramen',               'iLoveRamen',               'camelize capitalized string');
test('css-class-name',             'cssClassName',             'camelize dasherized string');
test('action_name',                'actionName',               'camelize underscored string');
test('action.name',                'actionName',               'camelize dot notation string');
test('innerHTML',                  'innerHTML',                'does nothing with camelcased string');
test('PrivateDocs/OwnerInvoice',   'privateDocs/ownerInvoice', 'camelize namespaced classified string');
test('private_docs/owner_invoice', 'privateDocs/ownerInvoice', 'camelize namespaced underscored string');
test('private-docs/owner-invoice', 'privateDocs/ownerInvoice', 'camelize namespaced dasherized string');
