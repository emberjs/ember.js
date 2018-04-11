import { ENV } from 'ember-environment';
import { decamelize } from '../../../lib/system/string';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

function test(assert, given, expected, description) {
  assert.deepEqual(decamelize(given), expected, description);
  if (ENV.EXTEND_PROTOTYPES.String) {
    assert.deepEqual(given.decamelize(), expected, description);
  }
}

moduleFor(
  'EmberStringUtils.decamelize',
  class extends AbstractTestCase {
    ['@test String.prototype.decamelize is not modified without EXTEND_PROTOTYPES'](assert) {
      if (!ENV.EXTEND_PROTOTYPES.String) {
        assert.ok(
          'undefined' === typeof String.prototype.decamelize,
          'String.prototype helper disabled'
        );
      } else {
        assert.expect(0);
      }
    }

    ['@test String decamelize tests'](assert) {
      test(assert, 'my favorite items', 'my favorite items', 'does nothing with normal string');
      test(assert, 'css-class-name', 'css-class-name', 'does nothing with dasherized string');
      test(assert, 'action_name', 'action_name', 'does nothing with underscored string');
      test(
        assert,
        'innerHTML',
        'inner_html',
        'converts a camelized string into all lower case separated by underscores.'
      );
      test(assert, 'size160Url', 'size160_url', 'decamelizes strings with numbers');
      test(
        assert,
        'PrivateDocs/OwnerInvoice',
        'private_docs/owner_invoice',
        'decamelize namespaced classified string'
      );
      test(
        assert,
        'privateDocs/ownerInvoice',
        'private_docs/owner_invoice',
        'decamelize namespaced camelized string'
      );
    }
  }
);
