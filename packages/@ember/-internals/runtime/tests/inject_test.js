import { inject } from '@ember/-internals/metal';
import { EMBER_NATIVE_DECORATOR_SUPPORT } from '@ember/canary-features';
import { DEBUG } from '@glimmer/env';
import EmberObject from '../lib/system/object';
import { buildOwner } from 'internal-test-helpers';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'inject',
  class extends AbstractTestCase {
    ['@test attempting to inject a nonexistent container key should error']() {
      let owner = buildOwner();
      let AnObject = EmberObject.extend({
        foo: inject('bar', 'baz'),
      });

      owner.register('foo:main', AnObject);

      expectAssertion(() => {
        owner.lookup('foo:main');
      }, /Attempting to inject an unknown injection: 'bar:baz'/);
    }

    ['@test factories should return a list of lazy injection full names'](assert) {
      if (DEBUG) {
        let AnObject = EmberObject.extend({
          foo: inject('foo', 'bar'),
          bar: inject('quux'),
        });

        assert.deepEqual(
          AnObject._lazyInjections(),
          {
            foo: {
              specifier: 'foo:bar',
              source: undefined,
              namespace: undefined,
            },
            bar: {
              specifier: 'quux:bar',
              source: undefined,
              namespace: undefined,
            },
          },
          'should return injected container keys'
        );
      } else {
        assert.expect(0);
      }
    }
  }
);

if (EMBER_NATIVE_DECORATOR_SUPPORT) {
  moduleFor(
    'inject - decorator',
    class extends AbstractTestCase {
      ['@test works with native decorators'](assert) {
        let owner = buildOwner();

        class Service extends EmberObject {}

        class Foo extends EmberObject {
          @inject('service', 'main') main;
        }

        owner.register('service:main', Service);
        owner.register('foo:main', Foo);

        let foo = owner.lookup('foo:main');

        assert.ok(foo.main instanceof Service, 'service injected correctly');
      }

      ['@test uses the decorated property key if not provided'](assert) {
        let owner = buildOwner();

        function service() {
          return inject('service', ...arguments);
        }

        class Service extends EmberObject {}

        class Foo extends EmberObject {
          @service main;
        }

        owner.register('service:main', Service);
        owner.register('foo:main', Foo);

        let foo = owner.lookup('foo:main');

        assert.ok(foo.main instanceof Service, 'service injected correctly');
      }
    }
  );
}
