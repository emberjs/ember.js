import Ember from 'ember-metal/core';
import { set, trySet } from 'ember-metal/property_set';
import { get } from 'ember-metal/property_get';

var obj;
function commonSetup() {
  obj = {
    foo: {
      bar: {
        baz: { biff: 'BIFF' }
      }
    }
  };
}

function commonTeardown() {
  obj = null;
}

QUnit.module('set with path', {
  setup: commonSetup,
  teardown: commonTeardown
});

QUnit.test('[Foo, bar] -> Foo.bar', function() {
  Ember.lookup.Foo = { toString() { return 'Foo'; } }; // Behave like an Ember.Namespace

  set(Ember.lookup.Foo, 'bar', 'baz');
  equal(get(Ember.lookup.Foo, 'bar'), 'baz');
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

// ..........................................................
// DEPRECATED
//

QUnit.module('set with path - deprecated', {
  setup: commonSetup,
  teardown: commonTeardown
});

QUnit.test('[obj, bla.bla] gives a proper exception message', function() {
  var exceptionMessage = 'Property set failed: object in path \"bla\" could not be found or was destroyed.';
  try {
    set(obj, 'bla.bla', 'BAM');
  } catch(ex) {
    equal(ex.message, exceptionMessage);
  }
});

QUnit.test('[obj, foo.baz.bat] -> EXCEPTION', function() {
  throws(function() {
    set(obj, 'foo.baz.bat', 'BAM');
  }, Error);
});

QUnit.test('[obj, foo.baz.bat] -> EXCEPTION', function() {
  trySet(obj, 'foo.baz.bat', 'BAM');
  ok(true, 'does not raise');
});
