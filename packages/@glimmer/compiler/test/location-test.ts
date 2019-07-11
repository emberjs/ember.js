import { offsetToLocation, locationToOffset } from '@glimmer/compiler';
import { Dict } from '@glimmer/interfaces';

const test = QUnit.test;

const cases: Dict<[string, number | null][]> = {
  'hello world': [['0:0', 0], ['0:5', 5], ['0:11', 11], ['0:12', null], ['1:0', null]],
  'hello world\n': [['0:0', 0], ['0:5', 5], ['0:11', 11], ['0:12', null], ['1:0', null]],
  'hello world\n\n': [
    ['0:0', 0],
    ['0:5', 5],
    ['0:11', 11],
    ['0:12', null],
    ['1:0', 12],
    ['1:1', null],
    ['2:0', null],
  ],
  'hello world\ngoodbye world': [
    ['0:0', 0],
    ['0:5', 5],
    ['0:11', 11],
    ['0:12', null],
    ['1:0', 12],
    ['1:7', 19],
    ['1:13', 25],
    ['1:14', null],
    ['2:0', null],
  ],
  'hello world\ngoodbye world\n': [
    ['0:0', 0],
    ['0:5', 5],
    ['0:11', 11],
    ['0:12', null],
    ['1:0', 12],
    ['1:7', 19],
    ['1:13', 25],
    ['1:14', null],
    ['2:0', null],
  ],
};

QUnit.module('locations - position');

Object.keys(cases).forEach(string => {
  for (let [span, offset] of cases[string]) {
    let [line, column] = span.split(':').map(i => parseInt(i));

    if (offset === null) continue;

    test(`${string} @ ${offset} -> ${line}:${column}`, assert => {
      assert.deepEqual(offsetToLocation(string, offset!), { line, column });
    });
  }
});

QUnit.module('locations - location');

Object.keys(cases).forEach(string => {
  for (let [span, offset] of cases[string]) {
    let [line, column] = span.split(':').map(i => parseInt(i));

    test(`${string} @ ${line}:${column} -> ${offset}`, assert => {
      assert.deepEqual(locationToOffset(string, line, column), offset === null ? null : offset);
    });
  }
});
