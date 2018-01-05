import {
  get,
  Mixin,
  mixin
} from '../..';

QUnit.module('Ember.Mixin.apply');

function K() {}

QUnit.test('using apply() should apply properties', function(assert) {
  let MixinA = Mixin.create({ foo: 'FOO', baz: K });
  let obj = {};
  mixin(obj, MixinA);

  assert.equal(get(obj, 'foo'), 'FOO', 'should apply foo');
  assert.equal(get(obj, 'baz'), K, 'should apply foo');
});

QUnit.test('applying anonymous properties', function(assert) {
  let obj = {};
  mixin(obj, {
    foo: 'FOO',
    baz: K
  });

  assert.equal(get(obj, 'foo'), 'FOO', 'should apply foo');
  assert.equal(get(obj, 'baz'), K, 'should apply foo');
});

QUnit.test('applying null values', function() {
  expectAssertion(() => mixin({}, null));
});

QUnit.test('applying a property with an undefined value', function(assert) {
  let obj = { tagName: '' };
  mixin(obj, { tagName: undefined });

  assert.strictEqual(get(obj, 'tagName'), '');
});
