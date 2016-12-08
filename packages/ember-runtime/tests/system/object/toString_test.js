import { guidFor, NAME_KEY } from 'ember-utils';
import { context } from 'ember-environment';
import EmberObject from '../../../system/object';
import Namespace from '../../../system/namespace';

let originalLookup = context.lookup;
let lookup;

QUnit.module('system/object/toString', {
  setup() {
    context.lookup = lookup = {};
  },
  teardown() {
    context.lookup = originalLookup;
  }
});

QUnit.test('NAME_KEY slot is present on Class', function() {
  ok(EmberObject.extend().hasOwnProperty(NAME_KEY), 'Ember Class\'s have a NAME_KEY slot');
});

QUnit.test('toString() returns the same value if called twice', function() {
  let Foo = Namespace.create();
  Foo.toString = function() { return 'Foo'; };

  Foo.Bar = EmberObject.extend();

  equal(Foo.Bar.toString(), 'Foo.Bar');
  equal(Foo.Bar.toString(), 'Foo.Bar');

  let obj = Foo.Bar.create();

  equal(obj.toString(), '<Foo.Bar:' + guidFor(obj) + '>');
  equal(obj.toString(), '<Foo.Bar:' + guidFor(obj) + '>');

  equal(Foo.Bar.toString(), 'Foo.Bar');
});

QUnit.test('toString on a class returns a useful value when nested in a namespace', function() {
  let obj;

  let Foo = Namespace.create();
  Foo.toString = function() { return 'Foo'; };

  Foo.Bar = EmberObject.extend();
  equal(Foo.Bar.toString(), 'Foo.Bar');

  obj = Foo.Bar.create();
  equal(obj.toString(), '<Foo.Bar:' + guidFor(obj) + '>');

  Foo.Baz = Foo.Bar.extend();
  equal(Foo.Baz.toString(), 'Foo.Baz');

  obj = Foo.Baz.create();
  equal(obj.toString(), '<Foo.Baz:' + guidFor(obj) + '>');

  obj = Foo.Bar.create();
  equal(obj.toString(), '<Foo.Bar:' + guidFor(obj) + '>');
});

QUnit.test('toString on a namespace finds the namespace in lookup', function() {
  let Foo = lookup.Foo = Namespace.create();

  equal(Foo.toString(), 'Foo');
});

QUnit.test('toString on a namespace finds the namespace in lookup', function() {
  let Foo = lookup.Foo = Namespace.create();
  let obj;

  Foo.Bar = EmberObject.extend();

  equal(Foo.Bar.toString(), 'Foo.Bar');

  obj = Foo.Bar.create();
  equal(obj.toString(), '<Foo.Bar:' + guidFor(obj) + '>');
});

QUnit.test('toString on a namespace falls back to modulePrefix, if defined', function() {
  let Foo = Namespace.create({ modulePrefix: 'foo' });

  equal(Foo.toString(), 'foo');
});

QUnit.test('toString includes toStringExtension if defined', function() {
  let Foo = EmberObject.extend({
    toStringExtension() {
      return 'fooey';
    }
  });
  let foo = Foo.create();
  let Bar = EmberObject.extend({});
  let bar = Bar.create();

  // simulate these classes being defined on a Namespace
  Foo[NAME_KEY] = 'Foo';
  Bar[NAME_KEY] = 'Bar';

  equal(bar.toString(), '<Bar:' + guidFor(bar) + '>', 'does not include toStringExtension part');
  equal(foo.toString(), '<Foo:' + guidFor(foo) + ':fooey>', 'Includes toStringExtension result');
});
