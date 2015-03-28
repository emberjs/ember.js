import Ember from "ember-metal/core";
import {guidFor, GUID_KEY} from "ember-metal/utils";
import EmberObject from "ember-runtime/system/object";
import Namespace from "ember-runtime/system/namespace";

var originalLookup, lookup;

QUnit.module('system/object/toString', {
  setup() {
    originalLookup = Ember.lookup;
    lookup = Ember.lookup = {};
  },
  teardown() {
    Ember.lookup = originalLookup;
  }
});

QUnit.test("toString() returns the same value if called twice", function() {
  var Foo = Namespace.create();
  Foo.toString = function() { return "Foo"; };

  Foo.Bar = EmberObject.extend();

  equal(Foo.Bar.toString(), "Foo.Bar");
  equal(Foo.Bar.toString(), "Foo.Bar");

  var obj = Foo.Bar.create();

  equal(obj.toString(), "<Foo.Bar:" + guidFor(obj) + ">");
  equal(obj.toString(), "<Foo.Bar:" + guidFor(obj) + ">");

  equal(Foo.Bar.toString(), "Foo.Bar");
});

QUnit.test("toString on a class returns a useful value when nested in a namespace", function() {
  var obj;

  var Foo = Namespace.create();
  Foo.toString = function() { return "Foo"; };

  Foo.Bar = EmberObject.extend();
  equal(Foo.Bar.toString(), "Foo.Bar");

  obj = Foo.Bar.create();
  equal(obj.toString(), "<Foo.Bar:" + guidFor(obj) + ">");

  Foo.Baz = Foo.Bar.extend();
  equal(Foo.Baz.toString(), "Foo.Baz");

  obj = Foo.Baz.create();
  equal(obj.toString(), "<Foo.Baz:" + guidFor(obj) + ">");

  obj = Foo.Bar.create();
  equal(obj.toString(), "<Foo.Bar:" + guidFor(obj) + ">");
});

QUnit.test("toString on a namespace finds the namespace in Ember.lookup", function() {
  var Foo = lookup.Foo = Namespace.create();

  equal(Foo.toString(), "Foo");
});

QUnit.test("toString on a namespace finds the namespace in Ember.lookup", function() {
  var Foo = lookup.Foo = Namespace.create();
  var obj;

  Foo.Bar = EmberObject.extend();

  equal(Foo.Bar.toString(), "Foo.Bar");

  obj = Foo.Bar.create();
  equal(obj.toString(), "<Foo.Bar:" + guidFor(obj) + ">");
});

QUnit.test("toString on a namespace falls back to modulePrefix, if defined", function() {
  var Foo = Namespace.create({ modulePrefix: 'foo' });

  equal(Foo.toString(), "foo");
});

QUnit.test('toString includes toStringExtension if defined', function() {
  var Foo = EmberObject.extend({
        toStringExtension() {
          return "fooey";
        }
      });
  var foo = Foo.create();
  var Bar = EmberObject.extend({});
  var bar = Bar.create();

  // simulate these classes being defined on a Namespace
  Foo[GUID_KEY+'_name'] = 'Foo';
  Bar[GUID_KEY+'_name'] = 'Bar';

  equal(bar.toString(), '<Bar:'+guidFor(bar)+'>', 'does not include toStringExtension part');
  equal(foo.toString(), '<Foo:'+guidFor(foo)+':fooey>', 'Includes toStringExtension result');
});
