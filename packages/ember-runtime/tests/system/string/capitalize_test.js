import { ENV } from 'ember-environment';
import { capitalize } from '../../../lib/system/string';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

function test(assert, given, expected, description) {
  assert.deepEqual(capitalize(given), expected, description);
  if (ENV.EXTEND_PROTOTYPES.String) {
    assert.deepEqual(given.capitalize(), expected, description);
  }
}

moduleFor(
  'EmberStringUtils.capitalize',
  class extends AbstractTestCase {
    ['@test String.prototype.capitalize is not modified without EXTEND_PROTOTYPES'](assert) {
      if (!ENV.EXTEND_PROTOTYPES.String) {
        assert.ok(
          'undefined' === typeof String.prototype.capitalize,
          'String.prototype helper disabled'
        );
      } else {
        assert.expect(0);
      }
    }

    ['@test String capitalize tests'](assert) {
      test(assert, 'my favorite items', 'My favorite items', 'capitalize normal string');
      test(assert, 'css-class-name', 'Css-class-name', 'capitalize dasherized string');
      test(assert, 'action_name', 'Action_name', 'capitalize underscored string');
      test(assert, 'innerHTML', 'InnerHTML', 'capitalize camelcased string');
      test(
        assert,
        'Capitalized string',
        'Capitalized string',
        'does nothing with capitalized string'
      );
      test(
        assert,
        'privateDocs/ownerInvoice',
        'PrivateDocs/OwnerInvoice',
        'capitalize namespaced camelized string'
      );
      test(
        assert,
        'private_docs/owner_invoice',
        'Private_docs/Owner_invoice',
        'capitalize namespaced underscored string'
      );
      test(
        assert,
        'private-docs/owner-invoice',
        'Private-docs/Owner-invoice',
        'capitalize namespaced dasherized string'
      );
      test(assert, 'šabc', 'Šabc', 'capitalize string with accent character');
    }
  }
);
