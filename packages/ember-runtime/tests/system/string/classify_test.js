import Ember from 'ember-metal/core'; // EXTEND_PROTOTYPES
import {classify} from 'ember-runtime/system/string';

QUnit.module('EmberStringUtils.classify');

if (!Ember.EXTEND_PROTOTYPES && !Ember.EXTEND_PROTOTYPES.String) {
  QUnit.test('String.prototype.classify is not modified without EXTEND_PROTOTYPES', function() {
    ok('undefined' === typeof String.prototype.classify, 'String.prototype helper disabled');
  });
}

function test(given, expected, description) {
  QUnit.test(description, function() {
    deepEqual(classify(given), expected);
    if (Ember.EXTEND_PROTOTYPES) {
      deepEqual(given.classify(), expected);
    }
  });
}

test('my favorite items',          'MyFavoriteItems',          'classify normal string');
test('css-class-name',             'CssClassName',             'classify dasherized string');
test('action_name',                'ActionName',               'classify underscored string');
test('privateDocs/ownerInvoice',   'PrivateDocs/OwnerInvoice', 'classify namespaced camelized string');
test('private_docs/owner_invoice', 'PrivateDocs/OwnerInvoice', 'classify namespaced underscored string');
test('private-docs/owner-invoice', 'PrivateDocs/OwnerInvoice', 'classify namespaced dasherized string');
test('-view-registry',             '_ViewRegistry',            'classify prefixed dasherized string');
test('components/-text-field',     'Components/_TextField',    'classify namespaced prefixed dasherized string');
test('_Foo_Bar',                   '_FooBar',                  'classify underscore-prefixed underscored string');
test('_Foo-Bar',                   '_FooBar',                  'classify underscore-prefixed dasherized string');
test('_foo/_bar',                  '_Foo/_Bar',                'classify underscore-prefixed-namespaced underscore-prefixed string');
test('-foo/_bar',                  '_Foo/_Bar',                'classify dash-prefixed-namespaced underscore-prefixed string');
test('-foo/-bar',                  '_Foo/_Bar',                'classify dash-prefixed-namespaced dash-prefixed string');
test('InnerHTML',                  'InnerHTML',                'does nothing with classified string');
test('_FooBar',                    '_FooBar',                  'does nothing with classified prefixed string');
