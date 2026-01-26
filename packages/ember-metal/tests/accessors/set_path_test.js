import { context } from 'ember-environment';
import {
  set,
  trySet,
  get
} from '../..';

let originalLookup = context.lookup;
let lookup;

let obj;
function commonSetup() {
  context.lookup = lookup = {};
  obj = {
    foo: {
      bar: {
        baz: { biff: 'BIFF' }
      }
    }
  };
}

function commonTeardown() {
  context.lookup = originalLookup;
  obj = null;
}

QUnit.module('set with path', {
  setup: commonSetup,
  teardown: commonTeardown
});

QUnit.test('[Foo, bar] -> Foo.bar', function() {
  lookup.Foo = { toString() { return 'Foo'; } }; // Behave like an Ember.Namespace

  set(lookup.Foo, 'bar', 'baz');
  equal(get(lookup.Foo, 'bar'), 'baz');
});

// ..........................................................
//
// LOCAL PATHS

QUnit.test('[obj, foo] -> obj.foo', function() {
  set(obj, 'foo', 'BAM');
  equal(get(obj, 'foo'), 'BAM');
});

QUnit.test('[obj, foo.bar] -> obj.foo.bar', function() {
  set(obj, 'foo.bar', 'BAM');
  equal(get(obj, 'foo.bar'), 'BAM');
});


QUnit.test(
  "ignores attempts to traverse through dangerous built-in Object properties",
  function (assert) {
    class Inner {}
    class Example {
      constructor() {
        this.inner = new Inner();
      }
    }
    let example = new Example();

    assert.throws(function () {
      set(example, "__proto__.ohNo", "polluted");
    }, /Property set failed: object in path "__proto__" could not be found./);
    assert.equal(
      Example.prototype.ohNo,
      undefined,
      "check for prototype pollution"
    );

    assert.throws(() => {
      set(example, "constructor.ohNo", "polluted");
    }, /Property set failed: object in path "constructor" could not be found./);
    assert.equal(Example.ohNo, undefined, "check for prototype pollution");

    assert.throws(() => {
      set(example, "inner.__proto__.ohNo", "polluted");
    }, /Property set failed: object in path "inner.__proto__" could not be found./);
    assert.equal(
      Inner.prototype.ohNo,
      undefined,
      "check for prototype pollution"
    );

    assert.throws(() => {
      set(example, "inner.constructor.ohNo", "polluted");
    }, /Property set failed: object in path "inner.constructor" could not be found./);
    assert.equal(Inner.ohNo, undefined, "check for prototype pollution");
  }
);



// ..........................................................
// DEPRECATED
//

QUnit.module('set with path - deprecated', {
  setup: commonSetup,
  teardown: commonTeardown
});

QUnit.test('[obj, bla.bla] gives a proper exception message', function() {
  let exceptionMessage = 'Property set failed: object in path \"bla\" could not be found or was destroyed.';
  try {
    set(obj, 'bla.bla', 'BAM');
  } catch (ex) {
    equal(ex.message, exceptionMessage);
  }
});

QUnit.test('[obj, foo.baz.bat] -> EXCEPTION', function() {
  throws(() => set(obj, 'foo.baz.bat', 'BAM'));
});

QUnit.test('[obj, foo.baz.bat] -> EXCEPTION', function() {
  trySet(obj, 'foo.baz.bat', 'BAM');
  ok(true, 'does not raise');
});
