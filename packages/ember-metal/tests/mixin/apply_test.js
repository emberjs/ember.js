import {
  get,
  Mixin,
  mixin
} from '../..';

QUnit.module('Ember.Mixin.apply');

function K() {}

QUnit.test('using apply() should apply properties', function() {
  let MixinA = Mixin.create({ foo: 'FOO', baz: K });
  let obj = {};
  mixin(obj, MixinA);

  equal(get(obj, 'foo'), 'FOO', 'should apply foo');
  equal(get(obj, 'baz'), K, 'should apply foo');
});

QUnit.test('applying anonymous properties', function() {
  let obj = {};
  mixin(obj, {
    foo: 'FOO',
    baz: K
  });

  equal(get(obj, 'foo'), 'FOO', 'should apply foo');
  equal(get(obj, 'baz'), K, 'should apply foo');
});

QUnit.test('applying null values', function() {
  expectAssertion(() => mixin({}, null));
});

QUnit.test('applying a property with an undefined value', function() {
  let obj = { tagName: '' };
  mixin(obj, { tagName: undefined });

  strictEqual(get(obj, 'tagName'), '');
});
