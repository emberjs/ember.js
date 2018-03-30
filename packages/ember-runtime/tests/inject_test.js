/* global EmberDev */

import { InjectedProperty } from 'ember-metal';
import { DEBUG } from 'ember-env-flags';
import inject from '../inject';
import { createInjectionHelper } from '../inject';
import EmberObject from '../system/object';
import { buildOwner } from 'internal-test-helpers';
import { moduleFor, AbstractTestCase } from 'internal-test-helpers';

moduleFor(
  'inject',
  class extends AbstractTestCase {
    ['@test calling `inject` directly should error']() {
      expectAssertion(() => {
        inject('foo');
      }, /Injected properties must be created through helpers/);
    }

    // this check is done via an assertion which is stripped from
    // production builds
    ['@test injection type validation is run when first looked up'](assert) {
      if (!EmberDev.runningProdBuild) {
        createInjectionHelper('foo', function() {
          assert.ok(true, 'should call validation method');
        });

        let owner = buildOwner();

        let AnObject = EmberObject.extend({
          bar: inject.foo(),
          baz: inject.foo()
        });

        owner.register('foo:main', AnObject);
        owner.register('foo:bar', EmberObject.extend());
        owner.register('foo:baz', EmberObject.extend());

        assert.expect(1);
        owner.lookup('foo:main');
      } else {
        assert.expect(0);
      }
    }

    ['@test attempting to inject a nonexistent container key should error'](
      assert
    ) {
      if (!EmberDev.runningProdBuild) {
        let owner = buildOwner();
        let AnObject = EmberObject.extend({
          foo: new InjectedProperty('bar', 'baz')
        });

        owner.register('foo:main', AnObject);

        assert.throws(() => {
          owner.lookup('foo:main');
        }, /Attempting to inject an unknown injection: 'bar:baz'/);
      } else {
        assert.expect(0);
      }
    }

    ['@test factories should return a list of lazy injection full names'](
      assert
    ) {
      if (DEBUG) {
        let AnObject = EmberObject.extend({
          foo: new InjectedProperty('foo', 'bar'),
          bar: new InjectedProperty('quux')
        });

        assert.deepEqual(
          AnObject._lazyInjections(),
          {
            foo: {
              specifier: 'foo:bar',
              source: undefined,
              namespace: undefined
            },
            bar: {
              specifier: 'quux:bar',
              source: undefined,
              namespace: undefined
            }
          },
          'should return injected container keys'
        );
      } else {
        assert.expect(0);
      }
    }
  }
);
