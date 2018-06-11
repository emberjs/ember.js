import { context } from 'ember-environment';
import { set, trySet, get } from '../..';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

let originalLookup = context.lookup;
let lookup;

let obj;
function commonSetup() {
  context.lookup = lookup = {};
  obj = {
    foo: {
      bar: {
        baz: { biff: 'BIFF' },
      },
    },
  };
}

function commonTeardown() {
  context.lookup = originalLookup;
  obj = null;
}

moduleFor(
  'set with path',
  class extends AbstractTestCase {
    constructor() {
      super();
      commonSetup();
    }

    teardown() {
      commonTeardown();
    }

    ['@test [Foo, bar] -> Foo.bar'](assert) {
      lookup.Foo = {
        toString() {
          return 'Foo';
        },
      }; // Behave like an Ember.Namespace

      set(lookup.Foo, 'bar', 'baz');
      assert.equal(get(lookup.Foo, 'bar'), 'baz');
    }

    // ..........................................................
    //
    // LOCAL PATHS

    ['@test [obj, foo] -> obj.foo'](assert) {
      set(obj, 'foo', 'BAM');
      assert.equal(get(obj, 'foo'), 'BAM');
    }

    ['@test [obj, foo.bar] -> obj.foo.bar'](assert) {
      set(obj, 'foo.bar', 'BAM');
      assert.equal(get(obj, 'foo.bar'), 'BAM');
    }
  }
);

moduleFor(
  'set with path - deprecated',
  class extends AbstractTestCase {
    constructor() {
      super();
      commonSetup();
    }

    teardown() {
      commonTeardown();
    }

    // ..........................................................
    // DEPRECATED
    //
    ['@test [obj, bla.bla] gives a proper exception message'](assert) {
      let exceptionMessage = 'Property set failed: object in path "bla" could not be found.';
      try {
        set(obj, 'bla.bla', 'BAM');
      } catch (ex) {
        assert.equal(ex.message, exceptionMessage);
      }
    }

    ['@test [obj, foo.baz.bat] -> EXCEPTION'](assert) {
      assert.throws(() => set(obj, 'foo.baz.bat', 'BAM'));
    }

    ['@test [obj, foo.baz.bat] -> EXCEPTION'](assert) {
      trySet(obj, 'foo.baz.bat', 'BAM');
      assert.ok(true, 'does not raise');
    }
  }
);
