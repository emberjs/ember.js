/* global EmberDev */

import InjectedProperty from "ember-metal/injected_property";
import {
  createInjectionHelper
} from "ember-runtime/inject";
import inject from "ember-runtime/inject";
import Container from "ember-runtime/system/container";
import Object from "ember-runtime/system/object";

if (Ember.FEATURES.isEnabled('ember-metal-injected-properties')) {
  QUnit.module('inject');

  test("calling `inject` directly should error", function() {
    expectAssertion(function() {
      inject('foo');
    }, /Injected properties must be created through helpers/);
  });

  if (!EmberDev.runningProdBuild) {
    // this check is done via an assertion which is stripped from
    // production builds
    test("injection type validation function is run once at mixin time", function() {
      expect(1);

      createInjectionHelper('foo', function() {
        ok(true, 'should call validation function');
      });

      var AnObject = Object.extend({
        bar: inject.foo(),
        baz: inject.foo()
      });

      // Prototype chains are lazy, make sure it's evaluated
      AnObject.proto();
    });
  }

  test("attempting to inject a nonexistent container key should error", function() {
    var container = new Container();
    var AnObject = Object.extend({
      container: container,
      foo: new InjectedProperty('bar', 'baz')
    });

    container.register('foo:main', AnObject);

    throws(function() {
      container.lookup('foo:main');
    }, /Attempting to inject an unknown injection: `bar:baz`/);
  });

  test("factories should return a list of lazy injection full names", function() {
    var AnObject = Object.extend({
      foo: new InjectedProperty('foo', 'bar'),
      bar: new InjectedProperty('quux')
    });

    deepEqual(AnObject.lazyInjections(), { 'foo': 'foo:bar', 'bar': 'quux:bar' }, "should return injected container keys");
  });
}
