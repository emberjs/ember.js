// ==========================================================================
// Project:  Ember Runtime
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*globals Foo:true $foo:true */

var obj, moduleOpts = {
  setup: function() {
    obj = {
      foo: {
        bar: {
          baz: { biff: 'BIFF' }
        }
      }

    };

    Foo = {
      bar: {
        baz: { biff: 'FooBiff' }
      }
    };

    $foo = {
      bar: {
        baz: { biff: '$FOOBIFF' }
      }
    };
  },

  teardown: function() {
    obj = null;
    Foo = null;
    $foo = null;
  }
};

module('Ember.set with path', moduleOpts);

test('[Foo, bar] -> Foo.bar', function() {
  window.Foo = {toString: function() { return 'Foo'; }}; // Behave like an Ember.Namespace
  Ember.set(Foo, 'bar', 'baz');
  equal(Ember.get(Foo, 'bar'), 'baz');
  window.Foo = null;
});

// ..........................................................
// LOCAL PATHS
//

test('[obj, foo] -> obj.foo', function() {
  Ember.set(obj, 'foo', "BAM");
  equal(Ember.get(obj, 'foo'), "BAM");
});

test('[obj, foo.bar] -> obj.foo.bar', function() {
  Ember.set(obj, 'foo.bar', "BAM");
  equal(Ember.get(obj, 'foo.bar'), "BAM");
});

test('[obj, this.foo] -> obj.foo', function() {
  Ember.set(obj, 'this.foo', "BAM");
  equal(Ember.get(obj, 'foo'), "BAM");
});

test('[obj, this.foo.bar] -> obj.foo.bar', function() {
  Ember.set(obj, 'this.foo.bar', "BAM");
  equal(Ember.get(obj, 'foo.bar'), "BAM");
});

// ..........................................................
// NO TARGET
//

test('[null, Foo.bar] -> Foo.bar', function() {
  Ember.set(null, 'Foo.bar', "BAM");
  equal(Ember.get(Foo, 'bar'), "BAM");
});

// ..........................................................
// DEPRECATED
//

module("Ember.set with path - deprecated", {
  setup: function() {
    Ember.TESTING_DEPRECATION = true;
    moduleOpts.setup();
  },
  teardown: function() {
    Ember.TESTING_DEPRECATION = false;
    moduleOpts.teardown();
  }
});

test('[obj, foo.baz.bat] -> EXCEPTION', function() {
  raises(function() {
    Ember.set(obj, 'foo.baz.bat', "BAM");
  }, Error);
});

test('[obj, foo.baz.bat] -> EXCEPTION', function() {
  Ember.trySet(obj, 'foo.baz.bat', "BAM");
  ok(true, "does not raise");
});
