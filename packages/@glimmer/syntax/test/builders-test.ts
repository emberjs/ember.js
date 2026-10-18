import { builders as b } from '@glimmer/syntax';

import { buildElement } from './parser-node-test';
import { astEqual } from './support';

QUnit.module('[glimmer-syntax] AST Builders');

QUnit.test('element uses comments as loc when comments is not an array', () => {
  let actual = buildElement('div', ['loc', b.loc(1, 1, 1, 1)]);
  let expected = buildElement('div', ['loc', b.loc(1, 1, 1, 1)]);

  astEqual(actual, expected);
});
