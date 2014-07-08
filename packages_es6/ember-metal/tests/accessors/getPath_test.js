/*globals Foo:true $foo:true */

import {get} from 'ember-metal/property_get';

var obj, moduleOpts = {
  setup: function() {
    obj = {
      foo: {
        bar: {
          baz: { biff: 'BIFF' }
        }
      },
      falseValue: false
    };

    window.Foo = {
      bar: {
        baz: { biff: 'FooBiff' }
      }
    };

    window.$foo = {
      bar: {
        baz: { biff: '$FOOBIFF' }
      }
    };
  },

  teardown: function() {
    obj = undefined;
    window.Foo = undefined;
    window.$foo = undefined;
  }
};

module('Ember.get with path', moduleOpts);

// ..........................................................
// LOCAL PATHS
//

test('[obj, foo] -> obj.foo', function() {
  deepEqual(get(obj, 'foo'), obj.foo);
});

test('[obj, foo.bar] -> obj.foo.bar', function() {
  deepEqual(get(obj, 'foo.bar'), obj.foo.bar);
});

test('[obj, this.foo] -> obj.foo', function() {
  deepEqual(get(obj, 'this.foo'), obj.foo);
});

test('[obj, this.foo.bar] -> obj.foo.bar', function() {
  deepEqual(get(obj, 'this.foo.bar'), obj.foo.bar);
});

test('[obj, this.Foo.bar] -> (null)', function() {
  deepEqual(get(obj, 'this.Foo.bar'), undefined);
});

test('[obj, falseValue.notDefined] -> (null)', function() {
  deepEqual(get(obj, 'falseValue.notDefined'), undefined);
});

// ..........................................................
// NO TARGET
//

test('[null, Foo] -> Foo', function() {
  deepEqual(get('Foo'), Foo);
});

test('[null, Foo.bar] -> Foo.bar', function() {
  deepEqual(get('Foo.bar'), Foo.bar);
});

