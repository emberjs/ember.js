/*globals Foo:true $foo:true */

import { get } from 'ember-metal/property_get';

var obj;
var moduleOpts = {
  setup: function() {
    obj = {
      foo: {
        bar: {
          baz: { biff: 'BIFF' }
        }
      },
      foothis: {
        bar: {
          baz: { biff: 'BIFF' }
        }
      },
      falseValue: false,
      Wuz: {
        nar: 'foo'
      }
    };

    window.Foo = {
      bar: {
        baz: { biff: 'FooBiff' }
      }
    };

    window.aProp = 'aPropy';

    window.$foo = {
      bar: {
        baz: { biff: '$FOOBIFF' }
      }
    };
  },

  teardown: function() {
    obj = undefined;
    window.Foo = undefined;
    window.aProp = undefined;
    window.$foo = undefined;
  }
};

QUnit.module('Ember.get with path', moduleOpts);

// ..........................................................
// LOCAL PATHS
//

QUnit.test('[obj, foo] -> obj.foo', function() {
  deepEqual(get(obj, 'foo'), obj.foo);
});

QUnit.test('[obj, foo.bar] -> obj.foo.bar', function() {
  deepEqual(get(obj, 'foo.bar'), obj.foo.bar);
});

QUnit.test('[obj, foothis.bar] -> obj.foothis.bar', function() {
  deepEqual(get(obj, 'foothis.bar'), obj.foothis.bar);
});

QUnit.test('[obj, this.foo] -> obj.foo', function() {
  deepEqual(get(obj, 'this.foo'), obj.foo);
});

QUnit.test('[obj, this.foo.bar] -> obj.foo.bar', function() {
  deepEqual(get(obj, 'this.foo.bar'), obj.foo.bar);
});

QUnit.test('[obj, this.Foo.bar] -> (undefined)', function() {
  equal(get(obj, 'this.Foo.bar'), undefined);
});

QUnit.test('[obj, falseValue.notDefined] -> (undefined)', function() {
  equal(get(obj, 'falseValue.notDefined'), undefined);
});

// ..........................................................
// GLOBAL PATHS TREATED LOCAL WITH GET
//

QUnit.test('[obj, Wuz] -> obj.Wuz', function() {
  deepEqual(get(obj, 'Wuz'), obj.Wuz);
});

QUnit.test('[obj, Wuz.nar] -> obj.Wuz.nar', function() {
  deepEqual(get(obj, 'Wuz.nar'), obj.Wuz.nar);
});

QUnit.test('[obj, Foo] -> (undefined)', function() {
  equal(get(obj, 'Foo'), undefined);
});

QUnit.test('[obj, Foo.bar] -> (undefined)', function() {
  equal(get(obj, 'Foo.bar'), undefined);
});

// ..........................................................
// NULL TARGET
//

QUnit.test('[null, Foo] -> Foo', function() {
  equal(get(null, 'Foo'), Foo);
});

QUnit.test('[null, Foo.bar] -> Foo.bar', function() {
  deepEqual(get(null, 'Foo.bar'), Foo.bar);
});

QUnit.test('[null, $foo] -> $foo', function() {
  equal(get(null, '$foo'), window.$foo);
});

QUnit.test('[null, aProp] -> null', function() {
  equal(get(null, 'aProp'), null);
});

// ..........................................................
// NO TARGET
//

QUnit.test('[Foo] -> Foo', function() {
  deepEqual(get('Foo'), Foo);
});

QUnit.test('[aProp] -> aProp', function() {
  deepEqual(get('aProp'), window.aProp);
});

QUnit.test('[Foo.bar] -> Foo.bar', function() {
  deepEqual(get('Foo.bar'), Foo.bar);
});
