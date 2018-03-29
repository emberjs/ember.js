import { ENV } from 'ember-environment';
import { underscore } from '../../../system/string';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

function test(assert, given, expected, description) {
  assert.deepEqual(underscore(given), expected, description);
  if (ENV.EXTEND_PROTOTYPES.String) {
    assert.deepEqual(given.underscore(), expected, description);
  }
}

moduleFor('EmberStringUtils.underscore', class extends AbstractTestCase {
  ['@test String.prototype.underscore is not available without EXTEND_PROTOTYPES'](assert) {
    if (!ENV.EXTEND_PROTOTYPES.String) {
      assert.ok('undefined' === typeof String.prototype.underscore, 'String.prototype helper disabled');
    } else {
      assert.expect(0);
    }
  }

  ['@test String underscore tests'](assert) {
    test(assert, 'my favorite items',          'my_favorite_items',          'with normal string');
    test(assert, 'css-class-name',             'css_class_name',             'with dasherized string');
    test(assert, 'action_name',                'action_name',                'does nothing with underscored string');
    test(assert, 'innerHTML',                  'inner_html',                 'with camelcased string');
    test(assert, 'PrivateDocs/OwnerInvoice',   'private_docs/owner_invoice', 'underscore namespaced classified string');
    test(assert, 'privateDocs/ownerInvoice',   'private_docs/owner_invoice', 'underscore namespaced camelized string');
    test(assert, 'private-docs/owner-invoice', 'private_docs/owner_invoice', 'underscore namespaced dasherized string');
  }
});
