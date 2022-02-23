const HTMLElement = window.HTMLElement;
const MATCHER_BRAND = '3d4ef194-13be-4ccf-8dc7-862eea02c93e';

interface Matcher<T> {
  [MATCHER_BRAND]: true;
  match(actual: T): boolean;
  expected(): T;
  message(): string;
}

function isMatcher(obj: unknown): obj is Matcher<unknown> {
  return typeof obj === 'object' && obj !== null && MATCHER_BRAND in obj;
}

function equalsAttr(expected: unknown) {
  return {
    [MATCHER_BRAND]: true,

    match(actual: unknown) {
      return expected === actual;
    },

    expected() {
      return expected;
    },

    message() {
      return `should equal ${this.expected()}`;
    },
  };
}

export function regex(r: RegExp) {
  return {
    [MATCHER_BRAND]: true,

    match(v: string) {
      return r.test(v);
    },

    expected() {
      return r.toString();
    },

    message() {
      return `should match ${this.expected()}`;
    },
  };
}

export function classes(expected: string) {
  return {
    [MATCHER_BRAND]: true,

    match(actual: string) {
      actual = actual.trim();
      return (
        actual &&
        expected.split(/\s+/).sort().join(' ') === actual.trim().split(/\s+/).sort().join(' ')
      );
    },

    expected() {
      return expected;
    },

    message() {
      return `should match ${this.expected()}`;
    },
  };
}

export function styles(expected: string) {
  return {
    [MATCHER_BRAND]: true,

    match(actual: string) {
      // coerce `null` or `undefined` to an empty string
      // needed for matching empty styles on IE9 - IE11
      actual = actual || '';
      actual = actual.trim();

      return (
        expected
          .split(';')
          .map((s) => s.trim())
          .filter((s) => s)
          .sort()
          .join('; ') ===
        actual
          .split(';')
          .map((s) => s.trim())
          .filter((s) => s)
          .sort()
          .join('; ')
      );
    },

    expected() {
      return expected;
    },

    message() {
      return `should match ${this.expected()}`;
    },
  };
}

export function equalsElement(
  assert: QUnit['assert'],
  element: Element,
  tagName: string,
  attributes: Record<string, unknown> | null,
  content: unknown
) {
  assert.pushResult({
    result: element.tagName === tagName.toUpperCase(),
    actual: element.tagName.toLowerCase(),
    expected: tagName,
    message: `expect tagName to be ${tagName}`,
  });

  let expectedAttrs = {};
  let expectedCount = 0;

  for (let name in attributes) {
    let expected = attributes[name];
    if (expected !== null) {
      expectedCount++;
    }

    let matcher = isMatcher(expected) ? expected : equalsAttr(expected);

    expectedAttrs[name] = matcher;

    assert.pushResult({
      result: expectedAttrs[name].match(element.getAttribute(name)),
      actual: element.getAttribute(name),
      expected: matcher.expected(),
      message: `Element's ${name} attribute ${matcher.message()}`,
    });
  }

  let actualAttributes = {};

  for (let attribute of element.attributes) {
    actualAttributes[attribute.name] = attribute.value;
  }

  if (!(element instanceof HTMLElement)) {
    assert.pushResult({
      result: element instanceof HTMLElement,
      actual: element,
      expected: typeof HTMLElement,
      message: 'Element must be an HTML Element, not an SVG Element',
    });
  } else {
    assert.pushResult({
      result: element.attributes.length === expectedCount || !attributes,
      actual: element.attributes.length,
      expected: expectedCount,
      message: `Expected ${expectedCount} attributes; got ${element.outerHTML}`,
    });

    if (content !== null) {
      assert.pushResult({
        result: element.innerHTML === content,
        actual: element.innerHTML,
        expected: content,
        message: `The element had '${content}' as its content`,
      });
    }
  }
}
