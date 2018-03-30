import { ENV } from 'ember-environment';
import { loc } from '../../../system/string';
import { setStrings, getStrings } from '../../../string_registry';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

let oldString;

function test(assert, given, args, expected, description) {
  assert.equal(loc(given, args), expected, description);
  if (ENV.EXTEND_PROTOTYPES.String) {
    assert.deepEqual(given.loc(...args), expected, description);
  }
}

moduleFor(
  'EmberStringUtils.loc',
  class extends AbstractTestCase {
    beforeEach() {
      oldString = getStrings();
      setStrings({
        '_Hello World': 'Bonjour le monde',
        '_Hello %@': 'Bonjour %@',
        '_Hello %@ %@': 'Bonjour %@ %@',
        '_Hello %@# %@#': 'Bonjour %@2 %@1',
      });
    }

    afterEach() {
      setStrings(oldString);
    }

    ['@test String.prototype.loc is not available without EXTEND_PROTOTYPES'](assert) {
      if (!ENV.EXTEND_PROTOTYPES.String) {
        assert.ok('undefined' === typeof String.prototype.loc, 'String.prototype helper disabled');
      } else {
        assert.expect(0);
      }
    }

    ['@test String loc tests'](assert) {
      test(
        assert,
        '_Hello World',
        [],
        'Bonjour le monde',
        `loc('_Hello World') => 'Bonjour le monde'`
      );
      test(
        assert,
        '_Hello %@ %@',
        ['John', 'Doe'],
        'Bonjour John Doe',
        `loc('_Hello %@ %@', ['John', 'Doe']) => 'Bonjour John Doe'`
      );
      test(
        assert,
        '_Hello %@# %@#',
        ['John', 'Doe'],
        'Bonjour Doe John',
        `loc('_Hello %@# %@#', ['John', 'Doe']) => 'Bonjour Doe John'`
      );
      test(
        assert,
        '_Not In Strings',
        [],
        '_Not In Strings',
        `loc('_Not In Strings') => '_Not In Strings'`
      );
    }

    ['@test works with argument form'](assert) {
      assert.equal(loc('_Hello %@', 'John'), 'Bonjour John');
      assert.equal(loc('_Hello %@ %@', ['John'], 'Doe'), 'Bonjour [John] Doe');
    }
  }
);
