/*globals Foo:true $foo:true */

import { get } from 'ember-metal/property_get';

function expectGlobalContextDeprecation(assertion) {
  expectDeprecation(
    assertion,
    "Ember.get fetched 'localPathGlobal' from the global context. This behavior will change in the future (issue #3852)"
  );
}

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

    window.localPathGlobal = 5;
  },

  teardown: function() {
    obj = undefined;
    window.Foo = undefined;
    window.$foo = undefined;
    window.localPathGlobal = undefined;
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

QUnit.test('[obj, this.Foo.bar] -> (null)', function() {
  deepEqual(get(obj, 'this.Foo.bar'), undefined);
});

QUnit.test('[obj, falseValue.notDefined] -> (null)', function() {
  deepEqual(get(obj, 'falseValue.notDefined'), undefined);
});

// ..........................................................
// LOCAL PATHS WITH NO TARGET DEPRECATION
//

QUnit.test('[null, length] returning data is deprecated', function() {
  expectGlobalContextDeprecation(function() {
    equal(5, get(null, 'localPathGlobal'));
  });
});

QUnit.test('[length] returning data is deprecated', function() {
  expectGlobalContextDeprecation(function() {
    equal(5, get('localPathGlobal'));
  });
});

// ..........................................................
// NO TARGET
//

QUnit.test('[null, Foo] -> Foo', function() {
  deepEqual(get('Foo'), Foo);
});

QUnit.test('[null, Foo.bar] -> Foo.bar', function() {
  deepEqual(get('Foo.bar'), Foo.bar);
});

