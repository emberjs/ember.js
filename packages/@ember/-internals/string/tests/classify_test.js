/* eslint-disable qunit/no-test-expect-argument */
import { classify } from '@ember/-internals/string';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

function test(assert, given, expected, description) {
  assert.deepEqual(classify(given), expected, description);
}

moduleFor(
  'EmberInternalsString.classify',
  class extends AbstractTestCase {
    ['@test String classify tests'](assert) {
      test(assert, 'my favorite items', 'MyFavoriteItems', 'classify normal string');
      test(assert, 'css-class-name', 'CssClassName', 'classify dasherized string');
      test(assert, 'action_name', 'ActionName', 'classify underscored string');
      test(
        assert,
        'privateDocs/ownerInvoice',
        'PrivateDocs/OwnerInvoice',
        'classify namespaced camelized string'
      );
      test(
        assert,
        'private_docs/owner_invoice',
        'PrivateDocs/OwnerInvoice',
        'classify namespaced underscored string'
      );
      test(
        assert,
        'private-docs/owner-invoice',
        'PrivateDocs/OwnerInvoice',
        'classify namespaced dasherized string'
      );
      test(assert, '-view-registry', '_ViewRegistry', 'classify prefixed dasherized string');
      test(
        assert,
        'components/-text-field',
        'Components/_TextField',
        'classify namespaced prefixed dasherized string'
      );
      test(assert, '_Foo_Bar', '_FooBar', 'classify underscore-prefixed underscored string');
      test(assert, '_Foo-Bar', '_FooBar', 'classify underscore-prefixed dasherized string');
      test(
        assert,
        '_foo/_bar',
        '_Foo/_Bar',
        'classify underscore-prefixed-namespaced underscore-prefixed string'
      );
      test(
        assert,
        '-foo/_bar',
        '_Foo/_Bar',
        'classify dash-prefixed-namespaced underscore-prefixed string'
      );
      test(
        assert,
        '-foo/-bar',
        '_Foo/_Bar',
        'classify dash-prefixed-namespaced dash-prefixed string'
      );
      test(assert, 'InnerHTML', 'InnerHTML', 'does nothing with classified string');
      test(assert, '_FooBar', '_FooBar', 'does nothing with classified prefixed string');
    }
  }
);
