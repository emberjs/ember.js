import {
  set,
  trySet
} from 'ember-metal/property_set';
import { get } from 'ember-metal/property_get';

var originalLookup = Ember.lookup;

var obj;
var moduleOpts = {
  setup: function() {
    obj = {
      foo: {
        bar: {
          baz: { biff: 'BIFF' }
        }
      }
    };

    Ember.lookup = {
      Foo: {
        bar: {
          baz: { biff: 'FooBiff' }
        }
      },

      $foo: {
        bar: {
          baz: { biff: '$FOOBIFF' }
        }
      }
    };
  },

  teardown: function() {
    obj = null;
    Ember.lookup = originalLookup;
  }
};

QUnit.module('set with path', moduleOpts);

test('[Foo, bar] -> Foo.bar', function() {
  Ember.lookup.Foo = {toString: function() { return 'Foo'; }}; // Behave like an Ember.Namespace

  set(Ember.lookup.Foo, 'bar', 'baz');
  equal(get(Ember.lookup.Foo, 'bar'), 'baz');
});

// ..........................................................
//
// LOCAL PATHS

test('[obj, foo] -> obj.foo', function() {
  set(obj, 'foo', "BAM");
  equal(get(obj, 'foo'), "BAM");
});

test('[obj, foo.bar] -> obj.foo.bar', function() {
  set(obj, 'foo.bar', "BAM");
  equal(get(obj, 'foo.bar'), "BAM");
});

test('[obj, this.foo] -> obj.foo', function() {
  set(obj, 'this.foo', "BAM");
  equal(get(obj, 'foo'), "BAM");
});

test('[obj, this.foo.bar] -> obj.foo.bar', function() {
  set(obj, 'this.foo.bar', "BAM");
  equal(get(obj, 'foo.bar'), "BAM");
});

// ..........................................................
// NO TARGET
//

test('[null, Foo.bar] -> Foo.bar', function() {
  set(null, 'Foo.bar', "BAM");
  equal(get(Ember.lookup.Foo, 'bar'), "BAM");
});

// ..........................................................
// DEPRECATED
//

QUnit.module("set with path - deprecated", {
  setup: function() {
    moduleOpts.setup();
  },
  teardown: function() {
    moduleOpts.teardown();
  }
});

test('[null, bla] gives a proper exception message', function() {
  var exceptionMessage = 'Property set failed: object in path \"bla\" could not be found or was destroyed.';
  try {
    set(null, 'bla', "BAM");
  } catch(ex) {
    equal(ex.message, exceptionMessage);
  }
});

test('[obj, bla.bla] gives a proper exception message', function() {
  var exceptionMessage = 'Property set failed: object in path \"bla\" could not be found or was destroyed.';
  try {
    set(obj, 'bla.bla', "BAM");
  } catch(ex) {
    equal(ex.message, exceptionMessage);
  }
});

test('[obj, foo.baz.bat] -> EXCEPTION', function() {
  raises(function() {
    set(obj, 'foo.baz.bat', "BAM");
  }, Error);
});

test('[obj, foo.baz.bat] -> EXCEPTION', function() {
  trySet(obj, 'foo.baz.bat', "BAM");
  ok(true, "does not raise");
});
