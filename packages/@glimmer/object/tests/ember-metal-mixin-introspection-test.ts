// NOTE: A previous iteration differentiated between public and private props
// as well as methods vs props.  We are just keeping these for testing; the
// current impl doesn't care about the differences as much...

import { mixin } from './support';
import { Mixin } from 'glimmer-object';

let PrivateProperty = Mixin.create({
  _foo: '_FOO'
});

let PublicProperty = Mixin.create({
  foo: 'FOO'
});

let PrivateMethod = Mixin.create({
  _fooMethod() {}
});

let PublicMethod = Mixin.create({
  fooMethod() {}
});

let BarProperties = Mixin.create({
  _bar: '_BAR',
  bar: 'bar'
});

let BarMethods = Mixin.create({
  _barMethod() {},
  barMethod() {}
});

let Combined = Mixin.create(BarProperties, BarMethods);

let obj;

QUnit.module('Mixin.mixins (introspection)', {
  setup() {
    obj = {};
    mixin(obj, PrivateProperty, PublicProperty, PrivateMethod, PublicMethod, Combined);
  }
});

QUnit.test('Ember.mixins()', function() {
  deepEqual(Mixin.mixins(obj),
    [PrivateProperty, PublicProperty, PrivateMethod, PublicMethod, BarProperties, BarMethods, Combined],
    'should return included mixins'
  );
});
