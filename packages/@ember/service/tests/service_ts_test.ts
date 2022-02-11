import Service, { inject, service } from '@ember/service';
import { Object as EmberObject } from '@ember/-internals/runtime';
import { buildOwner, runDestroy } from 'internal-test-helpers';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'inject - decorator (TS)',
  class extends AbstractTestCase {
    ['@test works with native decorators'](assert: QUnit['assert']) {
      let owner = buildOwner();

      class MainService extends Service {}

      class Foo extends EmberObject {
        @inject('main') declare main: MainService;
      }

      owner.register('service:main', MainService);
      owner.register('foo:main', Foo);

      let foo = owner.lookup('foo:main');

      assert.ok(foo.main instanceof Service, 'service injected correctly');

      runDestroy(owner);
    }

    ['@test uses the decorated property key if not provided'](assert: QUnit['assert']) {
      let owner = buildOwner();

      class MainService extends Service {}

      class Foo extends EmberObject {
        @inject declare main: MainService;
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
  'service - decorator (TS)',
  class extends AbstractTestCase {
    ['@test works with native decorators'](assert: QUnit['assert']) {
      let owner = buildOwner();

      class MainService extends Service {}

      class Foo extends EmberObject {
        @service('main') declare main: MainService;
      }

      owner.register('service:main', MainService);
      owner.register('foo:main', Foo);

      let foo = owner.lookup('foo:main');

      assert.ok(foo.main instanceof Service, 'service injected correctly');

      runDestroy(owner);
    }

    ['@test uses the decorated property key if not provided'](assert: QUnit['assert']) {
      let owner = buildOwner();

      class MainService extends Service {}

      class Foo extends EmberObject {
        @service declare main: MainService;
      }

      owner.register('service:main', MainService);
      owner.register('foo:main', Foo);

      let foo = owner.lookup('foo:main');

      assert.ok(foo.main instanceof Service, 'service injected correctly');

      runDestroy(owner);
    }
  }
);
