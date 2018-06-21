import { guidFor, NAME_KEY } from 'ember-utils';
import { context } from 'ember-environment';
import EmberObject from '../../../system/object';
import Namespace from '../../../system/namespace';

let originalLookup = context.lookup;
let lookup;

QUnit.module('system/object/toString', {
  beforeEach() {
    context.lookup = lookup = {};
  },
  afterEach() {
    context.lookup = originalLookup;
  }
});

QUnit.test('toString() returns the same value if called twice', function(assert) {
  let Foo = Namespace.create();
  Foo.toString = function() { return 'Foo'; };

  Foo.Bar = EmberObject.extend();

  assert.equal(Foo.Bar.toString(), 'Foo.Bar');
  assert.equal(Foo.Bar.toString(), 'Foo.Bar');

  let obj = Foo.Bar.create();

  assert.equal(obj.toString(), '<Foo.Bar:' + guidFor(obj) + '>');
  assert.equal(obj.toString(), '<Foo.Bar:' + guidFor(obj) + '>');

  assert.equal(Foo.Bar.toString(), 'Foo.Bar');
});

QUnit.test('toString on a class returns a useful value when nested in a namespace', function(assert) {
  let obj;

  let Foo = Namespace.create();
  Foo.toString = function() { return 'Foo'; };

  Foo.Bar = EmberObject.extend();
  assert.equal(Foo.Bar.toString(), 'Foo.Bar');

  obj = Foo.Bar.create();
  assert.equal(obj.toString(), '<Foo.Bar:' + guidFor(obj) + '>');

  Foo.Baz = Foo.Bar.extend();
  assert.equal(Foo.Baz.toString(), 'Foo.Baz');

  obj = Foo.Baz.create();
  assert.equal(obj.toString(), '<Foo.Baz:' + guidFor(obj) + '>');

  obj = Foo.Bar.create();
  assert.equal(obj.toString(), '<Foo.Bar:' + guidFor(obj) + '>');
});

QUnit.test('toString on a namespace finds the namespace in lookup', function(assert) {
  let Foo = lookup.Foo = Namespace.create();

  assert.equal(Foo.toString(), 'Foo');
});

QUnit.test('toString on a namespace finds the namespace in lookup', function(assert) {
  let Foo = lookup.Foo = Namespace.create();
  let obj;

  Foo.Bar = EmberObject.extend();

  assert.equal(Foo.Bar.toString(), 'Foo.Bar');

  obj = Foo.Bar.create();
  assert.equal(obj.toString(), '<Foo.Bar:' + guidFor(obj) + '>');
});

QUnit.test('toString on a namespace falls back to modulePrefix, if defined', function(assert) {
  let Foo = Namespace.create({ modulePrefix: 'foo' });

  assert.equal(Foo.toString(), 'foo');
});

QUnit.test('toString includes toStringExtension if defined', function(assert) {
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

  assert.equal(bar.toString(), '<Bar:' + guidFor(bar) + '>', 'does not include toStringExtension part');
  assert.equal(foo.toString(), '<Foo:' + guidFor(foo) + ':fooey>', 'Includes toStringExtension result');
});
