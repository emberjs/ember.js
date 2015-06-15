import {set} from "ember-metal/property_set";
import {get} from "ember-metal/property_get";
import {Mixin} from "ember-metal/mixin";
import { Binding } from "ember-metal/binding";
import run from "ember-metal/run_loop";

QUnit.module('system/mixin/binding_test');

QUnit.test('Defining a property ending in Binding should setup binding when applied', function() {

  var MyMixin = Mixin.create({
    fooBinding: 'bar.baz'
  });

  var obj = { bar: { baz: 'BIFF' } };

  run(function() {
    MyMixin.apply(obj);
  });

  ok(get(obj, 'fooBinding') instanceof Binding, 'should be a binding object');
  equal(get(obj, 'foo'), 'BIFF', 'binding should be created and synced');

});

QUnit.test('Defining a property ending in Binding should apply to prototype children', function() {
  var MyMixin, obj, obj2;

  run(function() {
    MyMixin = Mixin.create({
      fooBinding: 'bar.baz'
    });
  });

  obj = { bar: { baz: 'BIFF' } };

  run(function() {
    MyMixin.apply(obj);
  });


  obj2 = Object.create(obj);
  run(function() {
    set(get(obj2, 'bar'), 'baz', 'BARG');
  });


  ok(get(obj2, 'fooBinding') instanceof Binding, 'should be a binding object');
  equal(get(obj2, 'foo'), 'BARG', 'binding should be created and synced');

});
