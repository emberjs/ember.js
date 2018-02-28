import { ENV } from 'ember-environment';
import { loc } from '../../../system/string';
import { setStrings, getStrings } from '../../../string_registry';


let oldString;

QUnit.module('EmberStringUtils.loc', {
  beforeEach() {
    oldString = getStrings();
    setStrings({
      '_Hello World': 'Bonjour le monde',
      '_Hello %@': 'Bonjour %@',
      '_Hello %@ %@': 'Bonjour %@ %@',
      '_Hello %@# %@#': 'Bonjour %@2 %@1'
    });
  },

  afterEach() {
    setStrings(oldString);
  }
});

if (!ENV.EXTEND_PROTOTYPES.String) {
  QUnit.test('String.prototype.loc is not available without EXTEND_PROTOTYPES', function(assert) {
    assert.ok('undefined' === typeof String.prototype.loc, 'String.prototype helper disabled');
  });
}

function test(given, args, expected, description) {
  QUnit.test(description, function(assert) {
    assert.equal(loc(given, args), expected);
    if (ENV.EXTEND_PROTOTYPES.String) {
      assert.equal(given.loc(...args), expected);
    }
  });
}

test('_Hello World',    [],              'Bonjour le monde', `loc('_Hello World') => 'Bonjour le monde'`);
test('_Hello %@ %@',    ['John', 'Doe'], 'Bonjour John Doe', `loc('_Hello %@ %@', ['John', 'Doe']) => 'Bonjour John Doe'`);
test('_Hello %@# %@#',  ['John', 'Doe'], 'Bonjour Doe John', `loc('_Hello %@# %@#', ['John', 'Doe']) => 'Bonjour Doe John'`);
test('_Not In Strings', [],              '_Not In Strings',  `loc('_Not In Strings') => '_Not In Strings'`);

QUnit.test('works with argument form', function(assert) {
  assert.equal(loc('_Hello %@', 'John'), 'Bonjour John');
  assert.equal(loc('_Hello %@ %@', ['John'], 'Doe'), 'Bonjour [John] Doe');
});
