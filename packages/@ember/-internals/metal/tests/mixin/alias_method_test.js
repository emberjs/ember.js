import { get, Mixin, mixin, aliasMethod } from '../..';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

function validateAliasMethod(assert, obj) {
  assert.equal(obj.fooMethod(), 'FOO', 'obj.fooMethod()');
  assert.equal(obj.barMethod(), 'FOO', 'obj.barMethod should be a copy of foo');
}

moduleFor(
  'aliasMethod',
  class extends AbstractTestCase {
    ['@test methods of another name are aliased when the mixin is applied'](assert) {
      expectDeprecation(() => {
        let MyMixin = Mixin.create({
          fooMethod() {
            return 'FOO';
          },
          barMethod: aliasMethod('fooMethod'),
        });

        let obj = MyMixin.apply({});
        validateAliasMethod(assert, obj);
      }, /aliasMethod has been deprecated. Consider extracting the method into a shared utility function/);
    }

    ['@test should follow aliasMethods all the way down'](assert) {
      expectDeprecation(() => {
        let MyMixin = Mixin.create({
          bar: aliasMethod('foo'), // put first to break ordered iteration
          baz() {
            return 'baz';
          },
          foo: aliasMethod('baz'),
        });

        let obj = MyMixin.apply({});
        assert.equal(get(obj, 'bar')(), 'baz', 'should have followed aliasMethods');
      }, /aliasMethod has been deprecated. Consider extracting the method into a shared utility function/);
    }

    ['@test should alias methods from other dependent mixins'](assert) {
      expectDeprecation(() => {
        let BaseMixin = Mixin.create({
          fooMethod() {
            return 'FOO';
          },
        });

        let MyMixin = Mixin.create(BaseMixin, {
          barMethod: aliasMethod('fooMethod'),
        });

        let obj = MyMixin.apply({});
        validateAliasMethod(assert, obj);
      }, /aliasMethod has been deprecated. Consider extracting the method into a shared utility function/);
    }

    ['@test should alias methods from other mixins applied at same time'](assert) {
      expectDeprecation(() => {
        let BaseMixin = Mixin.create({
          fooMethod() {
            return 'FOO';
          },
        });

        let MyMixin = Mixin.create({
          barMethod: aliasMethod('fooMethod'),
        });

        let obj = mixin({}, BaseMixin, MyMixin);
        validateAliasMethod(assert, obj);
      }, /aliasMethod has been deprecated. Consider extracting the method into a shared utility function/);
    }

    ['@test should alias methods from mixins already applied on object'](assert) {
      expectDeprecation(() => {
        let BaseMixin = Mixin.create({
          quxMethod() {
            return 'qux';
          },
        });

        let MyMixin = Mixin.create({
          bar: aliasMethod('foo'),
          barMethod: aliasMethod('fooMethod'),
        });

        let obj = {
          fooMethod() {
            return 'FOO';
          },
        };

        BaseMixin.apply(obj);
        MyMixin.apply(obj);

        validateAliasMethod(assert, obj);
      }, /aliasMethod has been deprecated. Consider extracting the method into a shared utility function/);
    }
  }
);
