import { builders as b } from '..';
import { element } from './parser-node-test';
import { astEqual } from './support';

QUnit.module('[glimmer-syntax] AST Builders');

QUnit.test('element uses comments as loc when comments is not an array', function () {
  let actual = element('div', ['loc', b.loc(1, 1, 1, 1)]);
  let expected = element('div', ['loc', b.loc(1, 1, 1, 1)]);

  astEqual(actual, expected);
});
