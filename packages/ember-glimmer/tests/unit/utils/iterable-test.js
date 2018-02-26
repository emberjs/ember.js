import Ember from 'ember';
import { moduleFor, TestCase } from 'ember-glimmer/tests/utils/test-case';
import iterableFor from 'ember-glimmer/utils/iterable';
import { UpdatableReference } from 'ember-glimmer/utils/references';
import eachIn from 'ember-glimmer/helpers/each-in';
import { EvaluatedPositionalArgs } from '@glimmer/runtime';

const ITERATOR_KEY_GUID = 'be277757-bbbe-4620-9fcb-213ef433cca2';

moduleFor('Iterable', class extends TestCase {
  ['@test iterates over an array']() {
    let iterator = iteratorForArray(['foo', 'bar']);

    this.assert.deepEqual(iterator.next(), { key: 'foo', memo: 0, value: 'foo' });
    this.assert.deepEqual(iterator.next(), { key: 'bar', memo: 1, value: 'bar' });
  }

  ['@test iterates over an `Ember.A`']() {
    let iterator = iteratorForArray(Ember.A(['foo', 'bar']));

    this.assert.deepEqual(iterator.next(), { key: 'foo', memo: 0, value: 'foo' });
    this.assert.deepEqual(iterator.next(), { key: 'bar', memo: 1, value: 'bar' });
  }

  ['@test returns `null` when out of items']() {
    let iterator = iteratorForArray(['foo']);

    this.assert.deepEqual(iterator.next(), { key: 'foo', memo: 0, value: 'foo' });
    this.assert.deepEqual(iterator.next(), null);
  }

  ['@test iterates over an array with indices as keys']() {
    let iterator = iteratorForArray(['foo', 'bar'], '@index');

    this.assert.deepEqual(iterator.next(), { key: '0', memo: 0, value: 'foo' });
    this.assert.deepEqual(iterator.next(), { key: '1', memo: 1, value: 'bar' });
  }

  ['@test iterates over an array with identities as keys']() {
    let iterator = iteratorForArray(['foo', 'bar'], '@identity');

    this.assert.deepEqual(iterator.next(), { key: 'foo', memo: 0, value: 'foo' });
    this.assert.deepEqual(iterator.next(), { key: 'bar', memo: 1, value: 'bar' });
  }

  ['@test iterates over an array with arbitrary properties as keys']() {
    let iterator = iteratorForArray([{ k: 'first', v: 'foo' }, { k: 'second', v: 'bar' }], 'k');

    this.assert.deepEqual(iterator.next(), { key: 'first', memo: 0, value: { k: 'first', v: 'foo' } });
    this.assert.deepEqual(iterator.next(), { key: 'second', memo: 1, value: { k: 'second', v: 'bar' } });
  }

  ['@test errors on `#next` with an undefined ref']() {
    let iterator = iteratorForArray(undefined);

    this.assert.expect(1);

    try {
      iterator.next();
    } catch({ message }) {
      this.assert.equal(message, 'Cannot call next() on an empty iterator');
    }
  }

  ['@test errors on `#next` with a null ref']() {
    let iterator = iteratorForArray(null);

    this.assert.expect(1);

    try {
      iterator.next();
    } catch({ message }) {
      this.assert.equal(message, 'Cannot call next() on an empty iterator');
    }
  }

  ['@test errors on `#next` with an invalid ref type']() {
    let iterator = iteratorForArray('string');

    this.assert.expect(1);

    try {
      iterator.next();
    } catch({ message }) {
      this.assert.equal(message, 'Cannot call next() on an empty iterator');
    }
  }

  ['@test errors on `#next` with an empty array']() {
    let iterator = iteratorForArray([]);

    this.assert.expect(1);

    try {
      iterator.next();
    } catch({ message }) {
      this.assert.equal(message, 'Cannot call next() on an empty iterator');
    }
  }

  ['@test ensures keys are unique']() {
    let iterator = iteratorForArray([{ k: 'qux', v: 'foo' }, { k: 'qux', v: 'bar' }, { k: 'qux', v: 'baz' }], 'k');

    this.assert.deepEqual(iterator.next(), { key: 'qux', memo: 0, value: { k: 'qux', v: 'foo' } });
    this.assert.deepEqual(iterator.next(), { key: `qux${ITERATOR_KEY_GUID}1`, memo: 1, value: { k: 'qux', v: 'bar' } });
    this.assert.deepEqual(iterator.next(), { key: `qux${ITERATOR_KEY_GUID}2`, memo: 2, value: { k: 'qux', v: 'baz' } });
  }
});

function iteratorForArray(arr, keyPath) {
  let ref = new UpdatableReference(arr);
  let iterable = iterableFor(ref, keyPath);

  return iterable.iterate();
}
