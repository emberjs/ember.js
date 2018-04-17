import { ENV } from 'ember-environment';
import { dasherize } from '@ember/string';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

function test(assert, given, expected, description) {
  assert.deepEqual(dasherize(given), expected, description);
  if (ENV.EXTEND_PROTOTYPES.String) {
    assert.deepEqual(given.dasherize(), expected, description);
  }
}

moduleFor(
  'EmberStringUtils.dasherize',
  class extends AbstractTestCase {
    ['@test String.prototype.dasherize is not modified without EXTEND_PROTOTYPES'](assert) {
      if (!ENV.EXTEND_PROTOTYPES.String) {
        assert.ok(
          'undefined' === typeof String.prototype.dasherize,
          'String.prototype helper disabled'
        );
      } else {
        assert.expect(0);
      }
    }

    ['@test String dasherize tests'](assert) {
      test(assert, 'my favorite items', 'my-favorite-items', 'dasherize normal string');
      test(assert, 'css-class-name', 'css-class-name', 'does nothing with dasherized string');
      test(assert, 'action_name', 'action-name', 'dasherize underscored string');
      test(assert, 'innerHTML', 'inner-html', 'dasherize camelcased string');
      test(
        assert,
        'toString',
        'to-string',
        'dasherize string that is the property name of Object.prototype'
      );
      test(
        assert,
        'PrivateDocs/OwnerInvoice',
        'private-docs/owner-invoice',
        'dasherize namespaced classified string'
      );
      test(
        assert,
        'privateDocs/ownerInvoice',
        'private-docs/owner-invoice',
        'dasherize namespaced camelized string'
      );
      test(
        assert,
        'private_docs/owner_invoice',
        'private-docs/owner-invoice',
        'dasherize namespaced underscored string'
      );
    }
  }
);
