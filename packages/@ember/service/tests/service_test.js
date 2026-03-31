import Service, { inject, service } from '@ember/service';
import CoreObject from '@ember/object/core';
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

      class Foo extends CoreObject {
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

      class Foo extends CoreObject {
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

      class Foo extends CoreObject {
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

      class Foo extends CoreObject {
        @service main;
      }

      owner.register('service:main', MainService);
      owner.register('foo:main', Foo);

      let foo = owner.lookup('foo:main');

      assert.ok(foo.main instanceof Service, 'service injected correctly');

      runDestroy(owner);
    }
  }
);
