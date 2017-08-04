import { builders as b } from "..";
import { astEqual } from "./support";

QUnit.module('[glimmer-syntax] AST Builders');

QUnit.test('element uses comments as loc when comments is not an array', function() {
  let actual = b.element('div', [], [], [], b.loc(1,1,1,1));
  let expected = b.element('div', [], [], [], [], b.loc(1,1,1,1));

  astEqual(actual, expected);
});
