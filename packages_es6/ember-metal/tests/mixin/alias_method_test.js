module('Ember.aliasMethod');

function validateAliasMethod(obj) {
  equal(obj.fooMethod(), 'FOO', 'obj.fooMethod()');
  equal(obj.barMethod(), 'FOO', 'obj.barMethod should be a copy of foo');
}

test('methods of another name are aliased when the mixin is applied', function() {

  var MyMixin = Ember.Mixin.create({
    fooMethod: function() { return 'FOO'; },
    barMethod: Ember.aliasMethod('fooMethod')
  });

  var obj = MyMixin.apply({});
  validateAliasMethod(obj);
});

test('should follow aliasMethods all the way down', function() {
  var MyMixin = Ember.Mixin.create({
    bar: Ember.aliasMethod('foo'), // put first to break ordered iteration
    baz: function() { return 'baz'; },
    foo: Ember.aliasMethod('baz')
  });

  var obj = MyMixin.apply({});
  equal(Ember.get(obj, 'bar')(), 'baz', 'should have followed aliasMethods');
});

test('should alias methods from other dependent mixins', function() {

  var BaseMixin = Ember.Mixin.create({
    fooMethod: function() { return 'FOO'; }
  });

  var MyMixin = Ember.Mixin.create(BaseMixin, {
    barMethod: Ember.aliasMethod('fooMethod')
  });

  var obj = MyMixin.apply({});
  validateAliasMethod(obj);
});

test('should alias methods from other mixins applied at same time', function() {

  var BaseMixin = Ember.Mixin.create({
    fooMethod: function() { return 'FOO'; }
  });

  var MyMixin = Ember.Mixin.create({
    barMethod: Ember.aliasMethod('fooMethod')
  });

  var obj = Ember.mixin({}, BaseMixin, MyMixin);
  validateAliasMethod(obj);
});

test('should alias methods from mixins already applied on object', function() {

  var BaseMixin = Ember.Mixin.create({
    quxMethod: function() { return 'qux'; }
  });

  var MyMixin = Ember.Mixin.create({
    bar: Ember.aliasMethod('foo'),
    barMethod: Ember.aliasMethod('fooMethod')
  });

  var obj = {
    fooMethod: function() { return 'FOO'; }
  };

  BaseMixin.apply(obj);
  MyMixin.apply(obj);

  validateAliasMethod(obj);
});
