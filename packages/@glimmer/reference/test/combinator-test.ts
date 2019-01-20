import { State, VersionedPathReference, UpdatableReference, map } from '@glimmer/reference';
import { tracked } from './support';

QUnit.module('@glimmer/reference - combinators: map');

QUnit.test('mapping a simple value', () => {
  let state: UpdatableReference<number> = State(1);
  let incr = increment(state);

  steps(1, state, incr, ['eq', 2], ['update', 2], ['eq', 3]);
});

QUnit.test('mapping an object', () => {
  let value = { first: 'Tom', last: 'Dale' };
  let state = State(value);
  let incr = full(state);

  steps(
    value,
    state,
    incr,
    ['eq', `Tom Dale`],
    ['update', { first: 'Thomas', last: 'Dale' }],
    ['eq', `Thomas Dale`]
  );
});

QUnit.test('mapping an object with interior mutability', () => {
  class Person {
    constructor(public first: string, public last: string) {}
  }

  tracked(Person, 'first');
  tracked(Person, 'last');

  let value = new Person('Tom', 'Dale');
  let state = State(value);
  let full = map(state, p => `${p.first} ${p.last}`);

  steps(
    value,
    state,
    full,
    ['eq', `Tom Dale`],
    ['update', new Person('Thomas', 'Dale')],
    ['eq', `Thomas Dale`],
    ['update-child', 'first', 'Tom'],
    ['eq', `Tom Dale`]
  );
});

export type Step<T, U, K extends keyof T> =
  | ['eq', U]
  | ['update', T]
  | ['update-child', keyof T, T[K]];

function steps<T, U, K extends keyof T>(
  state: T,
  ref: UpdatableReference<T>,
  derived: VersionedPathReference<U>,
  ...steps: Array<Step<T, U, K>>
) {
  let tag = derived.tag;
  let snapshot = tag.value();

  for (let step of steps) {
    switch (step[0]) {
      case 'eq':
        QUnit.assert.equal(derived.value(), step[1], JSON.stringify(step));
        QUnit.assert.equal(tag.validate(snapshot), true, `snapshot valid ${JSON.stringify(step)}`);
        break;
      case 'update':
        state = step[1];
        ref.update(step[1]);
        QUnit.assert.equal(
          tag.validate(snapshot),
          false,
          `snapshot invalidated ${JSON.stringify(step)}`
        );
        snapshot = tag.value();
        break;
      case 'update-child':
        state[step[1]] = step[2];
        QUnit.assert.equal(
          tag.validate(snapshot),
          false,
          `snapshot invalidated ${JSON.stringify(step)}`
        );
        snapshot = tag.value();
    }
  }
}

function increment(ref: VersionedPathReference<number>): VersionedPathReference<number> {
  return map(ref, i => i + 1);
}

function full(
  ref: VersionedPathReference<{ first: string; last: string }>
): VersionedPathReference<string> {
  return map(ref, p => `${p.first} ${p.last}`);
}
