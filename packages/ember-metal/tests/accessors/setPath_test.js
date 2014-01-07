var originalLookup = Ember.lookup;

var obj, moduleOpts = {
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

module('Ember.set with path', moduleOpts);

test('[Foo, bar] -> Foo.bar', function() {
  Ember.lookup.Foo = {toString: function() { return 'Foo'; }}; // Behave like an Ember.Namespace

  Ember.set(Ember.lookup.Foo, 'bar', 'baz');
  equal(Ember.get(Ember.lookup.Foo, 'bar'), 'baz');
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
  equal(Ember.get(Ember.lookup.Foo, 'bar'), "BAM");
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

test('[null, bla] gives a proper exception message', function() {
  var exceptionMessage = 'Property set failed: object in path \"bla\" could not be found or was destroyed.';
  try {
    Ember.set(null, 'bla', "BAM");
  } catch(ex) {
    equal(ex.message, exceptionMessage);
  }
});

test('[obj, bla.bla] gives a proper exception message', function() {
  var exceptionMessage = 'Property set failed: object in path \"bla\" could not be found or was destroyed.';
  try {
    Ember.set(obj, 'bla.bla', "BAM");
  } catch(ex) {
    equal(ex.message, exceptionMessage);
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
