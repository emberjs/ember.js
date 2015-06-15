// NOTE: A previous iteration differentiated between public and private props
// as well as methods vs props.  We are just keeping these for testing; the
// current impl doesn't care about the differences as much...

import { guidFor } from 'ember-metal/utils';
import {
  mixin,
  Mixin
} from 'ember-metal/mixin';

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

QUnit.module('Basic introspection', {
  setup() {
    obj = {};
    mixin(obj, PrivateProperty, PublicProperty, PrivateMethod, PublicMethod, Combined);
  }
});

QUnit.test('Ember.mixins()', function() {

  function mapGuids(ary) {
    return ary.map(function(x) { return guidFor(x); });
  }

  deepEqual(mapGuids(Mixin.mixins(obj)), mapGuids([PrivateProperty, PublicProperty, PrivateMethod, PublicMethod, Combined, BarProperties, BarMethods]), 'should return included mixins');
});
