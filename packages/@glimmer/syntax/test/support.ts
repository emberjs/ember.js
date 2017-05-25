import { preprocess as parse, AST } from '@glimmer/syntax';

function normalizeNode(obj: AST.Node | Array<AST.Node>): AST.Node | Array<AST.Node> {
  if (obj && typeof obj === 'object') {
    let newObj: any;
    if (Array.isArray(obj)) {
      newObj = obj.slice();
      for (let i = 0; i < obj.length; i++) {
        newObj[i] = normalizeNode(obj[i]);
      }
    } else {
      newObj = {};
      let keys = Object.keys(obj);
      for (let i = 0; i < keys.length; i++) {
        let key = keys[i];
        if (key === 'loc') continue;
        newObj[key] = key;
      }
    }
    return newObj;
  } else {
    return obj;
  }
}

export function astEqual(actual: any | null | undefined, expected: any | null | undefined, message?: string) {
  if (typeof actual === 'string') {
    actual = parse(actual);
  }
  if (typeof expected === 'string') {
    expected = parse(expected);
  }

  actual = normalizeNode(actual);
  expected = normalizeNode(expected);

  QUnit.assert.deepEqual(actual, expected, message);
}
