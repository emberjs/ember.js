import Service, { inject, service } from '@ember/service';
import EmberObject from '@ember/object';
import {
  AbstractTestCase,
  buildOwner,
  expectDeprecation,
  moduleFor,
  runDestroy,
  testUnless,
} from 'internal-test-helpers';
import { DEPRECATIONS } from '../../-internals/deprecations';

moduleFor(
  'inject - decorator',
  class extends AbstractTestCase {
    [`${testUnless(
      DEPRECATIONS.DEPRECATE_IMPORT_INJECT.isRemoved
    )} @test works with native decorators`](assert) {
      expectDeprecation(
        /Importing `inject` from `@ember\/service` is deprecated. Please import `service` instead./,
        DEPRECATIONS.DEPRECATE_IMPORT_INJECT.isEnabled
      );

      let owner = buildOwner();

      class MainService extends Service {}

      class Foo extends EmberObject {
        @inject('main') main;
      }

      owner.register('service:main', MainService);
      owner.register('foo:main', Foo);

      let foo = owner.lookup('foo:main');

      assert.ok(foo.main instanceof Service, 'service injected correctly');

      runDestroy(owner);
    }

    [`${testUnless(
      DEPRECATIONS.DEPRECATE_IMPORT_INJECT.isRemoved
    )} @test uses the decorated property key if not provided`](assert) {
      expectDeprecation(
        /Importing `inject` from `@ember\/service` is deprecated. Please import `service` instead./,
        DEPRECATIONS.DEPRECATE_IMPORT_INJECT.isEnabled
      );

      let owner = buildOwner();

      class MainService extends Service {}
      class Foo extends EmberObject {
        @inject main;
      }

      owner.register('service:main', MainService);
      owner.register('foo:main', Foo);

      let foo = owner.lookup('foo:main');

      assert.ok(foo.main instanceof Service, 'service injected correctly');

      runDestroy(owner);
    }
  }
);

moduleFor(
  'service - decorator',
  class extends AbstractTestCase {
    ['@test works with native decorators'](assert) {
      let owner = buildOwner();

      class MainService extends Service {}

      class Foo extends EmberObject {
        @service('main') main;
      }

      owner.register('service:main', MainService);
      owner.register('foo:main', Foo);

      let foo = owner.lookup('foo:main');

      assert.ok(foo.main instanceof Service, 'service injected correctly');

      runDestroy(owner);
    }

    ['@test uses the decorated property key if not provided'](assert) {
      let owner = buildOwner();

      class MainService extends Service {}

      class Foo extends EmberObject {
        @service main;
      }

      owner.register('service:main', MainService);
      owner.register('foo:main', Foo);

      let foo = owner.lookup('foo:main');

      assert.ok(foo.main instanceof Service, 'service injected correctly');

      runDestroy(owner);
    }

    ['@test can be replaced by assignment'](assert) {
      let owner = buildOwner();

      class MainService extends Service {}

      class Foo extends EmberObject {
        @service main;
      }

      owner.register('service:main', MainService);
      owner.register('foo:main', Foo);

      let foo = owner.lookup('foo:main');
      let replacement = {};
      foo.main = replacement;
      assert.strictEqual(foo.main, replacement, 'replaced');

      runDestroy(owner);
    }

    ['@test throws when used in wrong syntactic position'](assert) {
      // I'm allowing the assertions to be different under the new decorator
      // standard because the assertions on the old one were pretty bad.
      if (import.meta.env.VITE_STABLE_DECORATORS) {
        assert.throws(() => {
          // eslint-disable-next-line no-unused-vars
          class Foo extends EmberObject {
            @service main() {}
          }
        }, /The @service decorator does not support method main/);

        assert.throws(() => {
          @service
          // eslint-disable-next-line no-unused-vars
          class Foo extends EmberObject {}
        }, /The @service decorator does not support class Foo/);
      } else {
        assert.expect(0);
      }
    }
  }
);
