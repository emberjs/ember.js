import { get, mixin } from './support';
import {
  Mixin as ParentMixin,
  aliasMethod
} from 'htmlbars-object';

QUnit.module('Mixin.aliasMethod');

function validateAliasMethod(obj) {
  equal(obj.fooMethod(), 'FOO', 'obj.fooMethod()');
  equal(obj.barMethod(), 'FOO', 'obj.barMethod should be a copy of foo');
}

class Mixin extends ParentMixin {
  apply(obj: Object) {
    return mixin(obj, this);
  }
}

QUnit.test('methods of another name are aliased when the mixin is applied', function() {
  var MyMixin = <Mixin>Mixin.create({
    fooMethod() { return 'FOO'; },
    barMethod: aliasMethod('fooMethod')
  });

  var obj = MyMixin.apply({});
  validateAliasMethod(obj);
});

QUnit.test('should follow aliasMethods all the way down', function() {
  var MyMixin = <Mixin>Mixin.create({
    bar: aliasMethod('foo'), // put first to break ordered iteration
    baz() { return 'baz'; },
    foo: aliasMethod('baz')
  });

  var obj = MyMixin.apply({});
  equal(get(obj, 'bar')(), 'baz', 'should have followed aliasMethods');
});

QUnit.skip('should alias methods from other dependent mixins', function() {
  var BaseMixin = Mixin.create({
    fooMethod() { return 'FOO'; }
  });

  var MyMixin = Mixin.create(BaseMixin, {
    barMethod: aliasMethod('fooMethod')
  });

  var obj = MyMixin.apply({});
  validateAliasMethod(obj);
});

QUnit.test('should alias methods from other mixins applied at same time', function() {
  var BaseMixin = Mixin.create({
    fooMethod() { return 'FOO'; }
  });

  var MyMixin = Mixin.create({
    barMethod: aliasMethod('fooMethod')
  });

  var obj = mixin({}, BaseMixin, MyMixin);
  validateAliasMethod(obj);
});

QUnit.test('should alias methods from mixins already applied on object', function() {
  var BaseMixin = Mixin.create({
    quxMethod() { return 'qux'; }
  });

  var MyMixin = Mixin.create({
    bar: aliasMethod('foo'),
    barMethod: aliasMethod('fooMethod')
  });

  var obj = {
    fooMethod() { return 'FOO'; }
  };

  BaseMixin.apply(obj);
  MyMixin.apply(obj);

  validateAliasMethod(obj);
});