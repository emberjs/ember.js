import { ENV } from 'ember-environment';
import { decamelize } from '../../../system/string';

QUnit.module('EmberStringUtils.decamelize');

if (!ENV.EXTEND_PROTOTYPES.String) {
  QUnit.test('String.prototype.decamelize is not modified without EXTEND_PROTOTYPES', function() {
    ok('undefined' === typeof String.prototype.decamelize, 'String.prototype helper disabled');
  });
}

function test(given, expected, description) {
  QUnit.test(description, function() {
    deepEqual(decamelize(given), expected);
    if (ENV.EXTEND_PROTOTYPES.String) {
      deepEqual(given.decamelize(), expected);
    }
  });
}

test('my favorite items',         'my favorite items',          'does nothing with normal string');
test('css-class-name',            'css-class-name',             'does nothing with dasherized string');
test('action_name',               'action_name',                'does nothing with underscored string');
test('innerHTML',                 'inner_html',                 'converts a camelized string into all lower case separated by underscores.');
test('size160Url',                'size160_url',                'decamelizes strings with numbers');
test('PrivateDocs/OwnerInvoice',  'private_docs/owner_invoice', 'decamelize namespaced classified string');
test('privateDocs/ownerInvoice',  'private_docs/owner_invoice', 'decamelize namespaced camelized string');
