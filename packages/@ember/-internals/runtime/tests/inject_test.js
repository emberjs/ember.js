import { inject } from '@ember/-internals/metal';
import { DEBUG } from '@glimmer/env';
import EmberObject from '@ember/object/lib/ember-object';
import { buildOwner, testUnless } from 'internal-test-helpers';
import { runDestroy, moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'inject',
  class extends AbstractTestCase {
    [`${testUnless(import.meta.env?.EMBER_DROP_CLASSIC_FEATURES)} @test attempting to inject a nonexistent container key should error`]() {
      let owner = buildOwner();
      let AnObject = class extends EmberObject {
        @inject('bar', 'baz')
        foo;
      };

      owner.register('foo:main', AnObject);

      expectAssertion(() => {
        owner.lookup('foo:main');
      }, /Attempting to inject an unknown injection: 'bar:baz'/);

      runDestroy(owner);
    }

    [`${testUnless(import.meta.env?.EMBER_DROP_CLASSIC_FEATURES)} @test factories should return a list of lazy injection full names`](
      assert
    ) {
      if (DEBUG) {
        let AnObject = class extends EmberObject {
          @inject('foo', 'bar')
          foo;

          @inject('quux')
          bar;
        };

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
