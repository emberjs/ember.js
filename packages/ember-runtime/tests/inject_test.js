/* global EmberDev */

import { InjectedProperty } from 'ember-metal';
import { DEBUG } from 'ember-env-flags';
import inject from '../inject';
import {
  createInjectionHelper
} from '../inject';
import EmberObject from '../system/object';
import { buildOwner } from 'internal-test-helpers';

QUnit.module('inject');

QUnit.test('calling `inject` directly should error', function() {
  expectAssertion(() => {
    inject('foo');
  }, /Injected properties must be created through helpers/);
});

if (!EmberDev.runningProdBuild) {
  // this check is done via an assertion which is stripped from
  // production builds
  QUnit.test('injection type validation is run when first looked up', function(assert) {
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
  });

  QUnit.test('attempting to inject a nonexistent container key should error', function(assert) {
    let owner = buildOwner();
    let AnObject = EmberObject.extend({
      foo: new InjectedProperty('bar', 'baz')
    });

    owner.register('foo:main', AnObject);

    assert.throws(() => {
      owner.lookup('foo:main');
    }, /Attempting to inject an unknown injection: 'bar:baz'/);
  });
}

if (DEBUG) {
  QUnit.test('factories should return a list of lazy injection full names', function(assert) {
    let AnObject = EmberObject.extend({
      foo: new InjectedProperty('foo', 'bar'),
      bar: new InjectedProperty('quux')
    });

    assert.deepEqual(AnObject._lazyInjections(), { 'foo': 'foo:bar', 'bar': 'quux:bar' }, 'should return injected container keys');
  });
}
