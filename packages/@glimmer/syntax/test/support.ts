import { entries } from '@glimmer/util';

import { AST, preprocess as parse, PreprocessOptions } from '..';

function normalizeNode(obj: AST.Node | Array<AST.Node>): AST.Node | Array<AST.Node> {
  return normalizeValue(obj);
}

function normalizeValue<T extends AST.Node | AST.Node[] | unknown>(obj: T): T {
  if (obj && typeof obj === 'object') {
    if (Array.isArray(obj)) {
      return obj.map(normalizeValue) as T;
    } else {
      return Object.fromEntries(
        entries(obj).flatMap(([key, value]) =>
          key === 'loc' ? [] : [[key, normalizeValue(value)]]
        )
      ) as T;
    }
  } else {
    return obj;
  }
}

export function astEqual(
  actual: any | null | undefined,
  expected: any | null | undefined,
  message?: string,
  parseOptions?: PreprocessOptions
) {
  if (typeof actual === 'string') {
    actual = parse(actual, parseOptions);
  }
  if (typeof expected === 'string') {
    expected = parse(expected, parseOptions);
  }

  actual = normalizeNode(actual);
  expected = normalizeNode(expected);

  QUnit.assert.deepEqual(actual, expected, message);
}
