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
  'inject - decorator (TS)',
  class extends AbstractTestCase {
    [`${testUnless(
      DEPRECATIONS.DEPRECATE_IMPORT_INJECT.isRemoved
    )} @test works with native decorators`](assert: QUnit['assert']) {
      expectDeprecation(
        /Importing `inject` from `@ember\/service` is deprecated. Please import `service` instead./,
        DEPRECATIONS.DEPRECATE_IMPORT_INJECT.isEnabled
      );

      let owner = buildOwner();

      class MainService extends Service {}

      class Foo extends CoreObject {
        @inject('main') declare main: MainService;
      }

      owner.register('service:main', MainService);
      owner.register('foo:main', Foo);

      let foo = owner.lookup('foo:main') as Foo;

      assert.ok(foo.main instanceof Service, 'service injected correctly');

      runDestroy(owner);
    }

    [`${testUnless(
      DEPRECATIONS.DEPRECATE_IMPORT_INJECT.isRemoved
    )} @test uses the decorated property key if not provided`](assert: QUnit['assert']) {
      expectDeprecation(
        /Importing `inject` from `@ember\/service` is deprecated. Please import `service` instead./,
        DEPRECATIONS.DEPRECATE_IMPORT_INJECT.isEnabled
      );

      let owner = buildOwner();

      class MainService extends Service {}

      class Foo extends CoreObject {
        @inject declare main: MainService;
      }

      owner.register('service:main', MainService);
      owner.register('foo:main', Foo);

      let foo = owner.lookup('foo:main') as Foo;

      assert.ok(foo.main instanceof Service, 'service injected correctly');

      runDestroy(owner);
    }
  }
);

moduleFor(
  'service - decorator (TS)',
  class extends AbstractTestCase {
    ['@test works with native decorators'](assert: QUnit['assert']) {
      let owner = buildOwner();

      class MainService extends Service {}

      class Foo extends CoreObject {
        @service('main') declare main: MainService;
      }

      owner.register('service:main', MainService);
      owner.register('foo:main', Foo);

      let foo = owner.lookup('foo:main') as Foo;

      assert.ok(foo.main instanceof Service, 'service injected correctly');

      runDestroy(owner);
    }

    ['@test uses the decorated property key if not provided'](assert: QUnit['assert']) {
      let owner = buildOwner();

      class MainService extends Service {}

      class Foo extends CoreObject {
        @service declare main: MainService;
      }

      owner.register('service:main', MainService);
      owner.register('foo:main', Foo);

      let foo = owner.lookup('foo:main') as Foo;

      assert.ok(foo.main instanceof Service, 'service injected correctly');

      runDestroy(owner);
    }
  }
);
