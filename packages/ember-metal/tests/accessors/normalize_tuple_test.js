/*globals Foo:true, $foo:true */
import { normalizeTuple } from "ember-metal/property_get";

var obj;
var moduleOpts = {
  setup: function() {
    obj = {
      foo: {
        bar: {
          baz: {}
        }
      }
    };

    window.Foo = {
      bar: {
        baz: {}
      }
    };

    window.$foo = {
      bar: {
        baz: {}
      }
    };
  },

  teardown: function() {
    obj = undefined;
    window.Foo = undefined;
    window.$foo = undefined;
  }
};

QUnit.module('normalizeTuple', moduleOpts);

// ..........................................................
// LOCAL PATHS
//

QUnit.test('[obj, foo] -> [obj, foo]', function() {
  deepEqual(normalizeTuple(obj, 'foo'), [obj, 'foo']);
});

QUnit.test('[obj, *] -> [obj, *]', function() {
  deepEqual(normalizeTuple(obj, '*'), [obj, '*']);
});

QUnit.test('[obj, foo.bar] -> [obj, foo.bar]', function() {
  deepEqual(normalizeTuple(obj, 'foo.bar'), [obj, 'foo.bar']);
});

QUnit.test('[obj, foo.*] -> [obj, foo.*]', function() {
  deepEqual(normalizeTuple(obj, 'foo.*'), [obj, 'foo.*']);
});

QUnit.test('[obj, foo.*.baz] -> [obj, foo.*.baz]', function() {
  deepEqual(normalizeTuple(obj, 'foo.*.baz'), [obj, 'foo.*.baz']);
});

QUnit.test('[obj, this.foo] -> [obj, foo]', function() {
  deepEqual(normalizeTuple(obj, 'this.foo'), [obj, 'foo']);
});

QUnit.test('[obj, this.foo.bar] -> [obj, foo.bar]', function() {
  deepEqual(normalizeTuple(obj, 'this.foo.bar'), [obj, 'foo.bar']);
});

QUnit.test('[obj, this.Foo.bar] -> [obj, Foo.bar]', function() {
  deepEqual(normalizeTuple(obj, 'this.Foo.bar'), [obj, 'Foo.bar']);
});

// ..........................................................
// GLOBAL PATHS
//

QUnit.test('[obj, Foo] -> [Ember.lookup, Foo]', function() {
  deepEqual(normalizeTuple(obj, 'Foo'), [Ember.lookup, 'Foo']);
});

QUnit.test('[obj, Foo.bar] -> [Foo, bar]', function() {
  deepEqual(normalizeTuple(obj, 'Foo.bar'), [Foo, 'bar']);
});

QUnit.test('[obj, $foo.bar.baz] -> [$foo, bar.baz]', function() {
  deepEqual(normalizeTuple(obj, '$foo.bar.baz'), [$foo, 'bar.baz']);
});

// ..........................................................
// NO TARGET
//

QUnit.test('[null, Foo] -> [Ember.lookup, Foo]', function() {
  deepEqual(normalizeTuple(null, 'Foo'), [Ember.lookup, 'Foo']);
});

QUnit.test('[null, Foo.bar] -> [Foo, bar]', function() {
  deepEqual(normalizeTuple(null, 'Foo.bar'), [Foo, 'bar']);
});

QUnit.test("[null, foo] -> [undefined, '']", function() {
  deepEqual(normalizeTuple(null, 'foo'), [undefined, '']);
});

QUnit.test("[null, foo.bar] -> [undefined, '']", function() {
  deepEqual(normalizeTuple(null, 'foo'), [undefined, '']);
});

QUnit.test('[null, $foo] -> [Ember.lookup, $foo]', function() {
  deepEqual(normalizeTuple(null, '$foo'), [Ember.lookup, '$foo']);
});

QUnit.test('[null, $foo.bar] -> [$foo, bar]', function() {
  deepEqual(normalizeTuple(null, '$foo.bar'), [$foo, 'bar']);
});
