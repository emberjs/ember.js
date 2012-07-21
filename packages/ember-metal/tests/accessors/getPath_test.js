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

module('Ember.get with path', moduleOpts);

// ..........................................................
// LOCAL PATHS
//

test('[obj, foo] -> obj.foo', function() {
  deepEqual(Ember.get(obj, 'foo'), obj.foo);
});

test('[obj, foo.bar] -> obj.foo.bar', function() {
  deepEqual(Ember.get(obj, 'foo.bar'), obj.foo.bar);
});

test('[obj, this.foo] -> obj.foo', function() {
  deepEqual(Ember.get(obj, 'this.foo'), obj.foo);
});

test('[obj, this.foo.bar] -> obj.foo.bar', function() {
  deepEqual(Ember.get(obj, 'this.foo.bar'), obj.foo.bar);
});

test('[obj, this.Foo.bar] -> (null)', function() {
  deepEqual(Ember.get(obj, 'this.Foo.bar'), undefined);
});

// ..........................................................
// NO TARGET
//

test('[null, Foo] -> Foo', function() {
  deepEqual(Ember.get('Foo'), Foo);
});

test('[null, Foo.bar] -> Foo.bar', function() {
  deepEqual(Ember.get('Foo.bar'), Foo.bar);
});

