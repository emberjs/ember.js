import Service, { inject as injectService } from '@ember/service';
import { Object as EmberObject } from '@ember/-internals/runtime';
import { buildOwner } from 'internal-test-helpers';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'inject - decorator',
  class extends AbstractTestCase {
    ['@test works with native decorators'](assert) {
      let owner = buildOwner();

      class MainService extends Service {}

      class Foo extends EmberObject {
        @injectService('main') main;
      }

      owner.register('service:main', MainService);
      owner.register('foo:main', Foo);

      let foo = owner.lookup('foo:main');

      assert.ok(foo.main instanceof Service, 'service injected correctly');
    }

    ['@test uses the decorated property key if not provided'](assert) {
      let owner = buildOwner();

      class MainService extends Service {}

      class Foo extends EmberObject {
        @injectService main;
      }

      owner.register('service:main', MainService);
      owner.register('foo:main', Foo);

      let foo = owner.lookup('foo:main');

      assert.ok(foo.main instanceof Service, 'service injected correctly');
    }
  }
);
