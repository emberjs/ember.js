// NOTE: A previous iteration differentiated between public and private props
// as well as methods vs props.  We are just keeping these for testing; the
// current impl doesn't care about the differences as much...

import { guidFor } from 'ember-utils';
import {
  mixin,
  Mixin
} from '../../mixin';

const PrivateProperty = Mixin.create({
  _foo: '_FOO'
});
const PublicProperty = Mixin.create({
  foo: 'FOO'
});
const PrivateMethod = Mixin.create({
  _fooMethod() {}
});
const PublicMethod = Mixin.create({
  fooMethod() {}
});
const BarProperties = Mixin.create({
  _bar: '_BAR',
  bar: 'bar'
});
const BarMethods = Mixin.create({
  _barMethod() {},
  barMethod() {}
});

const Combined = Mixin.create(BarProperties, BarMethods);

let obj;

QUnit.module('Basic introspection', {
  setup() {
    obj = {};
    mixin(obj, PrivateProperty, PublicProperty, PrivateMethod, PublicMethod, Combined);
  }
});

QUnit.test('Ember.mixins()', function() {
  function mapGuids(ary) {
    return ary.map(x => guidFor(x));
  }

  deepEqual(mapGuids(Mixin.mixins(obj)), mapGuids([PrivateProperty, PublicProperty, PrivateMethod, PublicMethod, Combined, BarProperties, BarMethods]), 'should return included mixins');
});
