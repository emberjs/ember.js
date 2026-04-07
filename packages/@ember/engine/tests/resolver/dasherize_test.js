import { module } from 'qunit';
import { dasherize } from 'ember-resolver/string/index';
import createTestFunction from './helpers/create-test-function';

module('dasherize', function () {
  const test = createTestFunction(dasherize);

  test('my favorite items', 'my-favorite-items', 'dasherize normal string');
  test('css-class-name', 'css-class-name', 'does nothing with dasherized string');
  test('action_name', 'action-name', 'dasherize underscored string');
  test('innerHTML', 'inner-html', 'dasherize camelcased string');
  test('toString', 'to-string', 'dasherize string that is the property name of Object.prototype');
  test(
    'PrivateDocs/OwnerInvoice',
    'private-docs/owner-invoice',
    'dasherize namespaced classified string'
  );
  test(
    'privateDocs/ownerInvoice',
    'private-docs/owner-invoice',
    'dasherize namespaced camelized string'
  );
  test(
    'private_docs/owner_invoice',
    'private-docs/owner-invoice',
    'dasherize namespaced underscored string'
  );
});
