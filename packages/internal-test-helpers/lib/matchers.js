const HTMLElement = window.HTMLElement;
const MATCHER_BRAND = '3d4ef194-13be-4ccf-8dc7-862eea02c93e';

function isMatcher(obj) {
  return typeof obj === 'object' && obj !== null && MATCHER_BRAND in obj;
}

function equalsAttr(expected) {
  return {
    [MATCHER_BRAND]: true,

    match(actual) {
      return expected === actual;
    },

    expected() {
      return expected;
    },

    message() {
      return `should equal ${this.expected()}`;
    }
  };
}

export function regex(r) {
  return {
    [MATCHER_BRAND]: true,

    match(v) {
      return r.test(v);
    },

    expected() {
      return r.toString();
    },

    message() {
      return `should match ${this.expected()}`;
    }
  };
}

export function classes(expected) {
  return {
    [MATCHER_BRAND]: true,

    match(actual) {
      actual = actual.trim();
      return actual && (expected.split(/\s+/).sort().join(' ') === actual.trim().split(/\s+/).sort().join(' '));
    },

    expected() {
      return expected;
    },

    message() {
      return `should match ${this.expected()}`;
    }
  };
}

export function styles(expected) {
  return {
    [MATCHER_BRAND]: true,

    match(actual) {
      // coerce `null` or `undefined` to an empty string
      // needed for matching empty styles on IE9 - IE11
      actual = actual || '';
      actual = actual.trim();

      return (
        expected.split(';').map(s => s.trim()).filter(s => s).sort().join('; ') ===
        actual.split(';').map(s => s.trim()).filter(s => s).sort().join('; ')
      );
    },

    expected() {
      return expected;
    },

    message() {
      return `should match ${this.expected()}`;
    }
  };
}

export function equalsElement(element, tagName, attributes, content) {
  QUnit.push(element.tagName === tagName.toUpperCase(), element.tagName.toLowerCase(), tagName, `expect tagName to be ${tagName}`);

  let expectedAttrs = {};
  let expectedCount = 0;

  for (let name in attributes) {
    let expected = attributes[name];
    if (expected !== null) {
      expectedCount++;
    }

    let matcher = isMatcher(expected) ? expected : equalsAttr(expected);

    expectedAttrs[name] = matcher;

    QUnit.push(
      expectedAttrs[name].match(element.getAttribute(name)),
      element.getAttribute(name),
      matcher.expected(),
      `Element's ${name} attribute ${matcher.message()}`
    );
  }

  let actualAttributes = {};

  for (let i = 0, l = element.attributes.length; i < l; i++) {
    actualAttributes[element.attributes[i].name] = element.attributes[i].value;
  }

  if (!(element instanceof HTMLElement)) {
    QUnit.push(element instanceof HTMLElement, null, null, 'Element must be an HTML Element, not an SVG Element');
  } else {
    QUnit.push(
      element.attributes.length === expectedCount || !attributes,
      element.attributes.length,
      expectedCount,
      `Expected ${expectedCount} attributes; got ${element.outerHTML}`
    );

    if (content !== null) {
      QUnit.push(element.innerHTML === content, element.innerHTML, content, `The element had '${content}' as its content`);
    }
  }
}
