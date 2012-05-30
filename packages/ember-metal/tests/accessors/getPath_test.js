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

module('Ember.getPath', moduleOpts);

// ..........................................................
// LOCAL PATHS
//

test('[obj, foo] -> obj.foo', function() {
  deepEqual(Ember.getPath(obj, 'foo'), obj.foo);
});

test('[obj, *] -> obj', function() {
  deepEqual(Ember.getPath(obj, '*'), obj);
});

test('[obj, foo.bar] -> obj.foo.bar', function() {
  deepEqual(Ember.getPath(obj, 'foo.bar'), obj.foo.bar);
});

test('[obj, foo.*] -> obj.foo', function() {
  deepEqual(Ember.getPath(obj, 'foo.*'), obj.foo);
});

test('[obj, foo.*.baz] -> obj.foo.baz', function() {
  deepEqual(Ember.getPath(obj, 'foo.*.baz'), obj.foo.baz);
});

test('[obj, this.foo] -> obj.foo', function() {
  deepEqual(Ember.getPath(obj, 'this.foo'), obj.foo);
});

test('[obj, this.foo.bar] -> obj.foo.bar', function() {
  deepEqual(Ember.getPath(obj, 'this.foo.bar'), obj.foo.bar);
});

test('[obj, .foo.bar] -> obj.foo.bar', function() {
  deepEqual(Ember.getPath(obj, 'this.foo.bar'), obj.foo.bar);
});

test('[obj, this.Foo.bar] -> (null)', function() {
  deepEqual(Ember.getPath(obj, 'this.Foo.bar'), undefined);
});

// ..........................................................
// NO TARGET
//

test('[null, Foo] -> Foo', function() {
  deepEqual(Ember.getPath('Foo'), Foo);
});

test('[null, Foo.bar] -> Foo.bar', function() {
  deepEqual(Ember.getPath('Foo.bar'), Foo.bar);
});

