// NOTE: A previous iteration differentiated between public and private props
// as well as methods vs props.  We are just keeping these for testing; the
// current impl doesn't care about the differences as much...

import { mixin } from './support';
import { Mixin } from 'htmlbars-object';

var PrivateProperty = Mixin.create({
  _foo: '_FOO'
});

var PublicProperty = Mixin.create({
  foo: 'FOO'
});

var PrivateMethod = Mixin.create({
  _fooMethod() {}
});

var PublicMethod = Mixin.create({
  fooMethod() {}
});

var BarProperties = Mixin.create({
  _bar: '_BAR',
  bar: 'bar'
});

var BarMethods = Mixin.create({
  _barMethod() {},
  barMethod() {}
});

var Combined = Mixin.create(BarProperties, BarMethods);

var obj;

QUnit.module('Mixin.mixins (introspection)', {
  setup() {
    obj = {};
    mixin(obj, PrivateProperty, PublicProperty, PrivateMethod, PublicMethod, Combined);
  }
});

QUnit.test('Ember.mixins()', function() {
  deepEqual(Mixin.mixins(obj), [PrivateProperty, PublicProperty, PrivateMethod, PublicMethod, BarProperties, BarMethods, Combined], 'should return included mixins');
});