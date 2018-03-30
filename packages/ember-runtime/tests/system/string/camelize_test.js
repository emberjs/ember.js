import { ENV } from 'ember-environment';
import { camelize } from '../../../system/string';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

function test(assert, given, expected, description) {
  assert.deepEqual(camelize(given), expected, description);
  if (ENV.EXTEND_PROTOTYPES.String) {
    assert.deepEqual(given.camelize(), expected, description);
  }
}

moduleFor(
  'EmberStringUtils.camelize',
  class extends AbstractTestCase {
    ['@test String.prototype.camelize is not modified without EXTEND_PROTOTYPES'](assert) {
      if (!ENV.EXTEND_PROTOTYPES.String) {
        assert.ok(
          'undefined' === typeof String.prototype.camelize,
          'String.prototype helper disabled'
        );
      } else {
        assert.expect(0);
      }
    }

    ['@test String camelize tests'](assert) {
      test(assert, 'my favorite items', 'myFavoriteItems', 'camelize normal string');
      test(assert, 'I Love Ramen', 'iLoveRamen', 'camelize capitalized string');
      test(assert, 'css-class-name', 'cssClassName', 'camelize dasherized string');
      test(assert, 'action_name', 'actionName', 'camelize underscored string');
      test(assert, 'action.name', 'actionName', 'camelize dot notation string');
      test(assert, 'innerHTML', 'innerHTML', 'does nothing with camelcased string');
      test(
        assert,
        'PrivateDocs/OwnerInvoice',
        'privateDocs/ownerInvoice',
        'camelize namespaced classified string'
      );
      test(
        assert,
        'private_docs/owner_invoice',
        'privateDocs/ownerInvoice',
        'camelize namespaced underscored string'
      );
      test(
        assert,
        'private-docs/owner-invoice',
        'privateDocs/ownerInvoice',
        'camelize namespaced dasherized string'
      );
    }
  }
);
