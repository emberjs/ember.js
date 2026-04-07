import { module } from 'qunit';
import { decamelize } from 'ember-resolver/string/index';
import createTestFunction from './helpers/create-test-function';

module('decamelize', function () {
  const test = createTestFunction(decamelize);

  test('my favorite items', 'my favorite items', 'does nothing with normal string');
  test('css-class-name', 'css-class-name', 'does nothing with dasherized string');
  test('action_name', 'action_name', 'does nothing with underscored string');
  test(
    'innerHTML',
    'inner_html',
    'converts a camelized string into all lower case separated by underscores.'
  );
  test('size160Url', 'size160_url', 'decamelizes strings with numbers');
  test(
    'PrivateDocs/OwnerInvoice',
    'private_docs/owner_invoice',
    'decamelize namespaced classified string'
  );
  test(
    'privateDocs/ownerInvoice',
    'private_docs/owner_invoice',
    'decamelize namespaced camelized string'
  );
});
