/* global EmberDev */

import { InjectedProperty } from 'ember-metal';
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
  QUnit.test('injection type validation is run when first looked up', function() {
    expect(1);

    createInjectionHelper('foo', function() {
      ok(true, 'should call validation method');
    });

    let owner = buildOwner();

    let AnObject = EmberObject.extend({
      bar: inject.foo(),
      baz: inject.foo()
    });

    owner.register('foo:main', AnObject);
    owner._lookupFactory('foo:main');
  });

  QUnit.test('attempting to inject a nonexistent container key should error', function() {
    let owner = buildOwner();
    let AnObject = EmberObject.extend({
      foo: new InjectedProperty('bar', 'baz')
    });

    owner.register('foo:main', AnObject);

    throws(() => {
      owner.lookup('foo:main');
    }, /Attempting to inject an unknown injection: 'bar:baz'/);
  });
}

QUnit.test('factories should return a list of lazy injection full names', function() {
  let AnObject = EmberObject.extend({
    foo: new InjectedProperty('foo', 'bar'),
    bar: new InjectedProperty('quux')
  });

  deepEqual(AnObject._lazyInjections(), { 'foo': 'foo:bar', 'bar': 'quux:bar' }, 'should return injected container keys');
});
