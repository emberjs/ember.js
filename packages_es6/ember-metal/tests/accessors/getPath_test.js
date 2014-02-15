/*globals Foo:true $foo:true */

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

test('[obj, falseValue.notDefined] -> (null)', function() {
  deepEqual(Ember.get(obj, 'falseValue.notDefined'), undefined);
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

