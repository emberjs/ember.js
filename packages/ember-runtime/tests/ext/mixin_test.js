import {set} from 'ember-metal/property_set';
import {get} from 'ember-metal/property_get';
import {Mixin} from 'ember-metal/mixin';
import { Binding } from 'ember-metal/binding';
import run from 'ember-metal/run_loop';

QUnit.module('system/mixin/binding_test');

QUnit.test('Defining a property ending in Binding should setup binding when applied', function() {
  let MyMixin = Mixin.create({
    fooBinding: 'bar.baz'
  });

  let obj = { bar: { baz: 'BIFF' } };

  run(() => {
    let deprecationMessage = /`Ember.Binding` is deprecated/;

    expectDeprecation(() => {
      MyMixin.apply(obj);
    }, deprecationMessage);
  });

  ok(get(obj, 'fooBinding') instanceof Binding, 'should be a binding object');
  equal(get(obj, 'foo'), 'BIFF', 'binding should be created and synced');
});

QUnit.test('Defining a property ending in Binding should apply to prototype children', function() {
  let MyMixin = run(()  => {
    return Mixin.create({
      fooBinding: 'bar.baz'
    });
  });

  let obj = { bar: { baz: 'BIFF' } };

  run(function() {
    let deprecationMessage = /`Ember.Binding` is deprecated/;

    expectDeprecation(() => {
      MyMixin.apply(obj);
    }, deprecationMessage);
  });


  let obj2 = Object.create(obj);
  run(() => set(get(obj2, 'bar'), 'baz', 'BARG'));

  ok(get(obj2, 'fooBinding') instanceof Binding, 'should be a binding object');
  equal(get(obj2, 'foo'), 'BARG', 'binding should be created and synced');
});
