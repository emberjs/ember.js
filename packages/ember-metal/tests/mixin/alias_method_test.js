import { get } from 'ember-metal/property_get';
import {
  Mixin,
  mixin,
  aliasMethod
} from 'ember-metal/mixin';

QUnit.module('aliasMethod');

function validateAliasMethod(obj) {
  equal(obj.fooMethod(), 'FOO', 'obj.fooMethod()');
  equal(obj.barMethod(), 'FOO', 'obj.barMethod should be a copy of foo');
}

QUnit.test('methods of another name are aliased when the mixin is applied', function() {
  var MyMixin = Mixin.create({
    fooMethod: function() { return 'FOO'; },
    barMethod: aliasMethod('fooMethod')
  });

  var obj = MyMixin.apply({});
  validateAliasMethod(obj);
});

QUnit.test('should follow aliasMethods all the way down', function() {
  var MyMixin = Mixin.create({
    bar: aliasMethod('foo'), // put first to break ordered iteration
    baz: function() { return 'baz'; },
    foo: aliasMethod('baz')
  });

  var obj = MyMixin.apply({});
  equal(get(obj, 'bar')(), 'baz', 'should have followed aliasMethods');
});

QUnit.test('should alias methods from other dependent mixins', function() {
  var BaseMixin = Mixin.create({
    fooMethod: function() { return 'FOO'; }
  });

  var MyMixin = Mixin.create(BaseMixin, {
    barMethod: aliasMethod('fooMethod')
  });

  var obj = MyMixin.apply({});
  validateAliasMethod(obj);
});

QUnit.test('should alias methods from other mixins applied at same time', function() {
  var BaseMixin = Mixin.create({
    fooMethod: function() { return 'FOO'; }
  });

  var MyMixin = Mixin.create({
    barMethod: aliasMethod('fooMethod')
  });

  var obj = mixin({}, BaseMixin, MyMixin);
  validateAliasMethod(obj);
});

QUnit.test('should alias methods from mixins already applied on object', function() {
  var BaseMixin = Mixin.create({
    quxMethod: function() { return 'qux'; }
  });

  var MyMixin = Mixin.create({
    bar: aliasMethod('foo'),
    barMethod: aliasMethod('fooMethod')
  });

  var obj = {
    fooMethod: function() { return 'FOO'; }
  };

  BaseMixin.apply(obj);
  MyMixin.apply(obj);

  validateAliasMethod(obj);
});
