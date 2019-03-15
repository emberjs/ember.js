import { SimpleElement, SimpleNode } from '@simple-dom/interface';
import { Dict } from '@glimmer/interfaces';
import { dict, assign } from '@glimmer/util';

export interface DebugElement {
  element: SimpleElement | null;
  description: string;
}

function isDebugElement(el: SimpleElement | DebugElement): el is DebugElement {
  return !(el as Dict).nodeType;
}

function extract(element: EqualsElement): DebugElement {
  if (element === null) {
    return { element: null, description: 'element' };
  } else if (isDebugElement(element)) {
    return element;
  } else {
    return { element, description: 'element' };
  }
}

export type EqualsElement = SimpleElement | null | DebugElement;

export function equalsElement(
  input: EqualsElement,
  tagName: string,
  attributes: Dict,
  content: string | null
) {
  let { element, description } = extract(input);

  if (element === null) {
    QUnit.assert.pushResult({
      result: false,
      actual: element,
      expected: true,
      message: `failed - expected ${description} to not be null`,
    });
    return;
  }

  QUnit.assert.pushResult({
    result: element.tagName === tagName.toUpperCase(),
    actual: element.tagName.toLowerCase(),
    expected: tagName,
    message: `expect ${description}'s tagName to be ${tagName}`,
  });

  let expectedAttrs: Dict<Matcher> = dict<Matcher>();

  let expectedCount = 0;
  for (let prop in attributes) {
    expectedCount++;
    let expected = attributes[prop];

    let matcher: Matcher = isMatcher(expected) ? expected : equalsAttr(expected);
    expectedAttrs[prop] = matcher;

    QUnit.assert.pushResult({
      result: expectedAttrs[prop].match(element && element.getAttribute(prop)),
      actual: matcher.fail(element && element.getAttribute(prop)),
      expected: matcher.fail(element && element.getAttribute(prop)),
      message: `Expected ${description}'s ${prop} attribute ${matcher.expected()}`,
    });
  }

  let actualAttributes = dict();
  if (element) {
    for (let i = 0, l = element.attributes.length; i < l; i++) {
      actualAttributes[element.attributes[i].name] = element.attributes[i].value;
    }
  }

  if (!(element instanceof HTMLElement)) {
    QUnit.assert.pushResult({
      result: element instanceof HTMLElement,
      actual: null,
      expected: null,
      message: 'Element must be an HTML Element, not an SVG Element',
    });
  } else {
    QUnit.assert.pushResult({
      result: element.attributes.length === expectedCount,
      actual: element.attributes.length,
      expected: expectedCount,
      message: `Expected ${expectedCount} attributes; got ${element.outerHTML}`,
    });

    if (content !== null) {
      QUnit.assert.pushResult({
        result: element.innerHTML === content,
        actual: element.innerHTML,
        expected: content,
        message: `${description} had '${content}' as its content`,
      });
    }
  }
}

// TODO: Consider removing this
interface CompatibleTagNameMap extends ElementTagNameMap {
  foreignobject: SVGForeignObjectElement;
}

export function assertIsElement(node: SimpleNode | null): node is SimpleElement {
  let nodeType = node === null ? null : node.nodeType;
  QUnit.assert.pushResult({
    result: nodeType === 1,
    expected: 1,
    actual: nodeType,
    message: 'expected node to be an element',
  });
  return nodeType === 1;
}

export function assertNodeTagName<
  T extends keyof CompatibleTagNameMap,
  U extends CompatibleTagNameMap[T]
>(node: SimpleNode | null, tagName: T): node is SimpleNode & U {
  if (assertIsElement(node)) {
    const lowerTagName = node.tagName.toLowerCase();
    const nodeTagName = node.tagName;

    QUnit.assert.pushResult({
      result: lowerTagName === tagName || nodeTagName === tagName,
      expected: tagName,
      actual: nodeTagName,
      message: `expected tagName to be ${tagName} but was ${nodeTagName}`,
    });
    return nodeTagName === tagName || lowerTagName === tagName;
  }
  return false;
}

export function equalsAttr(expected: any): Matcher {
  return {
    '3d4ef194-13be-4ccf-8dc7-862eea02c93e': true,
    match(actual: any) {
      return expected === actual;
    },

    expected() {
      return `to equal ${expected}`;
    },

    fail(actual: any) {
      return `${actual} did not equal ${expected}`;
    },
  };
}

export function assertEmberishElement(
  element: SimpleElement,
  tagName: string,
  attrs: Object,
  contents: string
): void;
export function assertEmberishElement(element: SimpleElement, tagName: string, attrs: Object): void;
export function assertEmberishElement(
  element: SimpleElement,
  tagName: string,
  contents: string
): void;
export function assertEmberishElement(element: SimpleElement, tagName: string): void;
export function assertEmberishElement(...args: any[]): void {
  let [element, tagName, attrs, contents] = processAssertElementArgs(args);

  let fullAttrs = assign({ class: classes('ember-view'), id: regex(/^ember\d*$/) }, attrs);

  equalsElement(element, tagName, fullAttrs, contents);
}

export function assertSerializedInElement(result: string, expected: string, message?: string) {
  let matched = result.match(/<script glmr="%cursor:[0-9]*.%"><\/script>/);

  if (matched) {
    QUnit.assert.ok(true, `has cursor ${matched[0]}`);
    let [, trimmed] = result.split(matched![0]);
    QUnit.assert.equal(trimmed, expected, message);
  } else {
    QUnit.assert.ok(false, `does not have a cursor`);
  }
}

export function classes(expected: string) {
  return {
    '3d4ef194-13be-4ccf-8dc7-862eea02c93e': true,
    match(actual: string) {
      return (
        actual &&
        expected
          .split(' ')
          .sort()
          .join(' ') ===
          actual
            .split(' ')
            .sort()
            .join(' ')
      );
    },
    expected() {
      return `to include '${expected}'`;
    },
    fail(actual: string) {
      return `'${actual}'' did not match '${expected}'`;
    },
  };
}

export function regex(r: RegExp) {
  return {
    '3d4ef194-13be-4ccf-8dc7-862eea02c93e': true,
    match(v: string) {
      return r.test(v);
    },
    expected() {
      return `to match ${r}`;
    },
    fail(actual: string) {
      return `${actual} did not match ${r}`;
    },
  };
}

interface Matcher {
  '3d4ef194-13be-4ccf-8dc7-862eea02c93e': boolean;
  match(actual: any): boolean;
  fail(actual: any): string;
  expected(): string;
}

export const MATCHER = '3d4ef194-13be-4ccf-8dc7-862eea02c93e';

export function isMatcher(input: unknown): input is Matcher {
  if (typeof input !== 'object' || input === null) return false;
  return MATCHER in input;
}

/**
  Accomodates the various signatures of `assertEmberishElement` and `assertElement`, which can be any of:

  - element, tagName, attrs, contents
  - element, tagName, contents
  - element, tagName, attrs
  - element, tagName

  TODO: future refactorings should clean up this interface (likely just making all callers pass a POJO)
*/
export function processAssertElementArgs(args: any[]): [SimpleElement, string, any, string | null] {
  let element = args[0];

  if (args.length === 3) {
    if (typeof args[2] === 'string') return [element, args[1], {}, args[2]];
    else return [element, args[1], args[2], null];
  } else if (args.length === 2) {
    return [element, args[1], {}, null];
  } else {
    return [args[0], args[1], args[2], args[3]];
  }
}

export function assertElementShape(
  element: SimpleElement,
  tagName: string,
  attrs: Object,
  contents: string
): void;
export function assertElementShape(element: SimpleElement, tagName: string, attrs: Object): void;
export function assertElementShape(element: SimpleElement, tagName: string, contents: string): void;
export function assertElementShape(element: SimpleElement, tagName: string): void;
export function assertElementShape(...args: any[]): void {
  let [element, tagName, attrs, contents] = processAssertElementArgs(args);

  equalsElement(element, tagName, attrs, contents);
}
