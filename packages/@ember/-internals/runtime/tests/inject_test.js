import { inject } from '@ember/-internals/metal';
import { DEBUG } from '@glimmer/env';
import EmberObject from '@ember/object';
import { buildOwner } from 'internal-test-helpers';
import { runDestroy, moduleFor, AbstractTestCase } from 'internal-test-helpers';

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

      runDestroy(owner);
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
