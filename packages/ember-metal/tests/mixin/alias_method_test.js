import {
  get,
  Mixin,
  mixin,
  aliasMethod
} from '../..';

QUnit.module('aliasMethod');

function validateAliasMethod(assert, obj) {
  assert.equal(obj.fooMethod(), 'FOO', 'obj.fooMethod()');
  assert.equal(obj.barMethod(), 'FOO', 'obj.barMethod should be a copy of foo');
}

QUnit.test('methods of another name are aliased when the mixin is applied', function(assert) {
  let MyMixin = Mixin.create({
    fooMethod() { return 'FOO'; },
    barMethod: aliasMethod('fooMethod')
  });

  let obj = MyMixin.apply({});
  validateAliasMethod(assert, obj);
});

QUnit.test('should follow aliasMethods all the way down', function(assert) {
  let MyMixin = Mixin.create({
    bar: aliasMethod('foo'), // put first to break ordered iteration
    baz() { return 'baz'; },
    foo: aliasMethod('baz')
  });

  let obj = MyMixin.apply({});
  assert.equal(get(obj, 'bar')(), 'baz', 'should have followed aliasMethods');
});

QUnit.test('should alias methods from other dependent mixins', function(assert) {
  let BaseMixin = Mixin.create({
    fooMethod() { return 'FOO'; }
  });

  let MyMixin = Mixin.create(BaseMixin, {
    barMethod: aliasMethod('fooMethod')
  });

  let obj = MyMixin.apply({});
  validateAliasMethod(assert, obj);
});

QUnit.test('should alias methods from other mixins applied at same time', function(assert) {
  let BaseMixin = Mixin.create({
    fooMethod() { return 'FOO'; }
  });

  let MyMixin = Mixin.create({
    barMethod: aliasMethod('fooMethod')
  });

  let obj = mixin({}, BaseMixin, MyMixin);
  validateAliasMethod(assert, obj);
});

QUnit.test('should alias methods from mixins already applied on object', function(assert) {
  let BaseMixin = Mixin.create({
    quxMethod() { return 'qux'; }
  });

  let MyMixin = Mixin.create({
    bar: aliasMethod('foo'),
    barMethod: aliasMethod('fooMethod')
  });

  let obj = {
    fooMethod() { return 'FOO'; }
  };

  BaseMixin.apply(obj);
  MyMixin.apply(obj);

  validateAliasMethod(assert, obj);
});
