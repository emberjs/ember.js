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

module('Ember.setPath', moduleOpts);

// ..........................................................
// LOCAL PATHS
//

test('[obj, foo] -> obj.foo', function() {
  Ember.setPath(obj, 'foo', "BAM");
  equal(Ember.getPath(obj, 'foo'), "BAM");
});

test('[obj, *] -> EXCEPTION [cannot set *]', function() {
  raises(function() {
    Ember.setPath(obj, '*', "BAM");
  }, Error);
});

test('[obj, foo.bar] -> obj.foo.bar', function() {
  Ember.setPath(obj, 'foo.bar', "BAM");
  equal(Ember.getPath(obj, 'foo.bar'), "BAM");
});

test('[obj, foo.*] -> EXCEPTION', function() {
  raises(function() {
    Ember.setPath(obj, 'foo.*', "BAM");
  }, Error);
});

test('[obj, foo.*.baz] -> obj.foo.baz', function() {
  Ember.setPath(obj, 'foo.*.baz', "BAM");
  equal(Ember.getPath(obj, 'foo.baz'), "BAM");
});

test('[obj, this.foo] -> obj.foo', function() {
  Ember.setPath(obj, 'this.foo', "BAM");
  equal(Ember.getPath(obj, 'foo'), "BAM");
});

test('[obj, this.foo.bar] -> obj.foo.bar', function() {
  Ember.setPath(obj, 'this.foo.bar', "BAM");
  equal(Ember.getPath(obj, 'foo.bar'), "BAM");
});

test('[obj, .foo.bar] -> obj.foo.bar', function() {
  Ember.setPath(obj, '.foo.bar', "BAM");
  equal(Ember.getPath(obj, 'foo.bar'), "BAM");
});

// ..........................................................
// NO TARGET
//

test('[null, Foo.bar] -> Foo.bar', function() {
  Ember.setPath(null, 'Foo.bar', "BAM");
  equal(Ember.getPath(Foo, 'bar'), "BAM");
});

// ..........................................................
// DEPRECATED
//

module("Ember.setPath - deprecated", {
  setup: function() {
    Ember.TESTING_DEPRECATION = true;
    moduleOpts.setup();
  },
  teardown: function() {
    Ember.TESTING_DEPRECATION = false;
    moduleOpts.teardown();
  }
});

test('[obj, foo*bar] -> obj.foo.bar', function() {
  Ember.setPath(obj, 'foo*bar', "BAM");
  equal(Ember.getPath(obj, 'foo.bar'), "BAM");
});

test('[obj, foo*bar.*] -> EXCEPTION', function() {
  raises(function() {
    Ember.setPath(obj, 'foo.*.baz.*', "BAM");
  }, Error);
});

test('[obj, foo.bar*baz.biff] -> obj.foo.bar.baz.biff', function() {
  Ember.setPath(obj, 'foo.bar*baz.biff', "BAM");
  equal(Ember.getPath(obj, 'foo.bar.baz.biff'), "BAM");
});

test('[obj, *foo.bar] -> obj.foo.bar', function() {
  Ember.setPath(obj, '*foo.bar', "BAM");
  equal(Ember.getPath(obj, 'foo.bar'), "BAM");
});

test('[obj, this.foo*bar] -> obj.foo.bar', function() {
  Ember.setPath(obj, 'this.foo*bar', "BAM");
  equal(Ember.getPath(obj, 'foo.bar'), "BAM");
});

test('[obj, this.foo.bar*baz.biff] -> obj.foo.bar.baz.biff', function() {
  Ember.setPath(obj, 'this.foo.bar*baz.biff', "BAM");
  equal(Ember.getPath(obj, 'foo.bar.baz.biff'), "BAM");
});

test('[null, Foo*bar] -> Foo.bar', function() {
  Ember.setPath(null, 'Foo*bar', "BAM");
  equal(Ember.getPath(Foo, 'bar'), "BAM");
});

test('[null, Foo.bar*baz.biff] -> Foo.bar.baz.biff', function() {
  Ember.setPath(null, 'Foo.bar*baz.biff', "BAM");
  equal(Ember.getPath(Foo, 'bar.baz.biff'), "BAM");
});

test('[null, Foo.bar.baz*biff] -> Foo.bar.baz.biff', function() {
  Ember.setPath(null, 'Foo.bar.baz*biff', "BAM");
  equal(Ember.getPath(Foo, 'bar.baz.biff'), "BAM");
});

test('[obj, Foo] -> EXCEPTION', function() {
  raises(function() {
    Ember.setPath(obj, 'Foo', "BAM");
  }, Error);
});

test('[obj, foo.baz.bat] -> EXCEPTION', function() {
  raises(function() {
    Ember.setPath(obj, 'foo.baz.bat', "BAM");
  }, Error);
});

test('[obj, foo.baz.bat] -> EXCEPTION', function() {
  Ember.trySetPath(obj, 'foo.baz.bat', "BAM");
  ok(true, "does not raise");
});
