import { ENV } from 'ember-environment';
import { dasherize } from '../../../system/string';

QUnit.module('EmberStringUtils.dasherize');

if (!ENV.EXTEND_PROTOTYPES.String) {
  QUnit.test('String.prototype.dasherize is not modified without EXTEND_PROTOTYPES', function() {
    ok('undefined' === typeof String.prototype.dasherize, 'String.prototype helper disabled');
  });
}

function test(given, expected, description) {
  QUnit.test(description, function () {
    deepEqual(dasherize(given), expected);
    if (ENV.EXTEND_PROTOTYPES.String) {
      deepEqual(given.dasherize(), expected);
    }
  });
}

test('my favorite items',           'my-favorite-items',            'dasherize normal string');
test('css-class-name',              'css-class-name',               'does nothing with dasherized string');
test('action_name',                 'action-name',                  'dasherize underscored string');
test('innerHTML',                   'inner-html',                   'dasherize camelcased string');
test('toString',                    'to-string',                    'dasherize string that is the property name of Object.prototype');
test('PrivateDocs/OwnerInvoice',    'private-docs/owner-invoice',   'dasherize namespaced classified string');
test('privateDocs/ownerInvoice',    'private-docs/owner-invoice',   'dasherize namespaced camelized string');
test('private_docs/owner_invoice',  'private-docs/owner-invoice',   'dasherize namespaced underscored string');
