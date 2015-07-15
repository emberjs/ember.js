import { get } from 'ember-metal/property_get';

var obj;
var moduleOpts = {
  setup() {
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
      emptyString: '',
      Wuz: {
        nar: 'foo'
      }
    };
  },

  teardown() {
    obj = undefined;
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

QUnit.test('[obj, falseValue.notDefined] -> (undefined)', function() {
  equal(get(obj, 'falseValue.notDefined'), undefined);
});

QUnit.test('[obj, emptyString.length] -> 0', function() {
  equal(get(obj, 'emptyString.length'), 0);
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
