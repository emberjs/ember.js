import { Mixin, get, mixin } from './support';
import { aliasMethod } from 'glimmer-object';

QUnit.module('Mixin.aliasMethod');

function validateAliasMethod(obj) {
  equal(obj.fooMethod(), 'FOO', 'obj.fooMethod()');
  equal(obj.barMethod(), 'FOO', 'obj.barMethod should be a copy of foo');
}

QUnit.test('methods of another name are aliased when the mixin is applied', function() {
  let MyMixin = <Mixin>Mixin.create({
    fooMethod() { return 'FOO'; },
    barMethod: aliasMethod('fooMethod')
  });

  let obj = MyMixin.apply({});
  validateAliasMethod(obj);
});

QUnit.test('should follow aliasMethods all the way down', function() {
  let MyMixin = <Mixin>Mixin.create({
    bar: aliasMethod('foo'), // put first to break ordered iteration
    baz() { return 'baz'; },
    foo: aliasMethod('baz')
  });

  let obj = MyMixin.apply({});
  equal(get(obj, 'bar')(), 'baz', 'should have followed aliasMethods');
});

QUnit.skip('should alias methods from other dependent mixins', function() {
  let BaseMixin = Mixin.create({
    fooMethod() { return 'FOO'; }
  });

  let MyMixin = Mixin.create(BaseMixin, {
    barMethod: aliasMethod('fooMethod')
  });

  let obj = MyMixin.apply({});
  validateAliasMethod(obj);
});

QUnit.test('should alias methods from other mixins applied at same time', function() {
  let BaseMixin = Mixin.create({
    fooMethod() { return 'FOO'; }
  });

  let MyMixin = Mixin.create({
    barMethod: aliasMethod('fooMethod')
  });

  let obj = mixin({}, BaseMixin, MyMixin);
  validateAliasMethod(obj);
});

QUnit.test('should alias methods from mixins already applied on object', function() {
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

  validateAliasMethod(obj);
});
