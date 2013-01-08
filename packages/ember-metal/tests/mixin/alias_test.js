module('Ember.aliasMethod');

function validatealiasMethod(obj) {
  var get = Ember.get;
  equal(get(obj, 'foo'), 'foo', 'obj.foo');
  equal(get(obj, 'bar'), 'foo', 'obj.bar should be a copy of foo');

  equal(get(obj, 'computedFoo'), 'cfoo', 'obj.computedFoo');
  equal(get(obj, 'computedBar'), 'cfoo', 'obj.computedBar should be a copy of computedFoo');

  equal(obj.fooMethod(), 'FOO', 'obj.fooMethod()');
  equal(obj.barMethod(), 'FOO', 'obj.barMethod should be a copy of foo');
}

test('copies the property values from another key when the mixin is applied', function() {

  var MyMixin = Ember.Mixin.create({
    foo: 'foo',
    bar: Ember.aliasMethod('foo'),

    computedFoo: Ember.computed(function() {
      return 'cfoo';
    }),

    computedBar: Ember.aliasMethod('computedFoo'),

    fooMethod: function() { return 'FOO'; },
    barMethod: Ember.aliasMethod('fooMethod')
  });

  var obj = MyMixin.apply({});
  validatealiasMethod(obj);
});

test('should follow aliasMethodes all the way down', function() {
  var MyMixin = Ember.Mixin.create({
    bar: Ember.aliasMethod('foo'), // put first to break ordered iteration
    baz: 'baz',
    foo: Ember.aliasMethod('baz')
  });

  var obj = MyMixin.apply({});
  equal(Ember.get(obj, 'bar'), 'baz', 'should have followed aliasMethodes');
});

test('should copy from other dependent mixins', function() {

  var BaseMixin = Ember.Mixin.create({
    foo: 'foo',

    computedFoo: Ember.computed(function() {
      return 'cfoo';
    }),

    fooMethod: function() { return 'FOO'; }
  });

  var MyMixin = Ember.Mixin.create(BaseMixin, {
    bar: Ember.aliasMethod('foo'),
    computedBar: Ember.aliasMethod('computedFoo'),
    barMethod: Ember.aliasMethod('fooMethod')
  });

  var obj = MyMixin.apply({});
  validatealiasMethod(obj);
});

test('should copy from other mixins applied at same time', function() {

  var BaseMixin = Ember.Mixin.create({
    foo: 'foo',

    computedFoo: Ember.computed(function() {
      return 'cfoo';
    }),

    fooMethod: function() { return 'FOO'; }
  });

  var MyMixin = Ember.Mixin.create({
    bar: Ember.aliasMethod('foo'),
    computedBar: Ember.aliasMethod('computedFoo'),
    barMethod: Ember.aliasMethod('fooMethod')
  });

  var obj = Ember.mixin({}, BaseMixin, MyMixin);
  validatealiasMethod(obj);
});

test('should copy from properties already applied on object', function() {

  var BaseMixin = Ember.Mixin.create({
    foo: 'foo',

    computedFoo: Ember.computed(function() {
      return 'cfoo';
    })

  });

  var MyMixin = Ember.Mixin.create({
    bar: Ember.aliasMethod('foo'),
    computedBar: Ember.aliasMethod('computedFoo'),
    barMethod: Ember.aliasMethod('fooMethod')
  });

  var obj = {
    fooMethod: function() { return 'FOO'; }
  };

  BaseMixin.apply(obj);
  MyMixin.apply(obj);

  validatealiasMethod(obj);
});
