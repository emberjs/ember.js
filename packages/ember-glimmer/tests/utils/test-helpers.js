import { tokenize } from 'simple-html-tokenizer';

function generateTokens(containerOrHTML) {
  if (typeof containerOrHTML === 'string') {
    return {
      tokens: tokenize(containerOrHTML),
      html: containerOrHTML
    };
  } else {
    return {
      tokens: tokenize(containerOrHTML.innerHTML),
      html: containerOrHTML.innerHTML
    };
  }
}

// detect side-effects of cloning svg elements in IE9-11
let ieSVGInnerHTML = (function () {
  if (!document.createElementNS) {
    return false;
  }
  let div = document.createElement('div');
  let node = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  div.appendChild(node);
  let clone = div.cloneNode(true);
  return clone.innerHTML === '<svg xmlns="http://www.w3.org/2000/svg" />';
})();

function normalizeInnerHTML(actualHTML) {
  if (ieSVGInnerHTML) {
    // Replace `<svg xmlns="http://www.w3.org/2000/svg" height="50%" />` with `<svg height="50%"></svg>`, etc.
    // drop namespace attribute
    actualHTML = actualHTML.replace(/ xmlns="[^"]+"/, '');
    // replace self-closing elements
    actualHTML = actualHTML.replace(/<([^ >]+) [^\/>]*\/>/gi, function(tag, tagName) {
      return tag.slice(0, tag.length - 3) + '></' + tagName + '>';
    });
  }

  return actualHTML;
}

export function equalInnerHTML(fragment, html) {
  let actualHTML = normalizeInnerHTML(fragment.innerHTML);
  QUnit.push(actualHTML === html, actualHTML, html);
}

function normalizeTokens(tokens) {
  tokens.forEach(token => {
    if (token.type === 'StartTag') {
      token.attributes = token.attributes.sort(function(a, b) {
        if (a[0] > b[0]) { return 1; }
        if (a[0] < b[0]) { return -1; }
        return 0;
      });
    }
  });
}

export function equalTokens(actualContainer, expectedHTML, message = null) {
  let actual = generateTokens(actualContainer);
  let expected = generateTokens(expectedHTML);

  normalizeTokens(actual.tokens);
  normalizeTokens(expected.tokens);

  let equiv = QUnit.equiv(actual.tokens, expected.tokens);

  if (equiv && expected.html !== actual.html) {
    deepEqual(actual.tokens, expected.tokens, message);
  } else {
    QUnit.push(QUnit.equiv(actual.tokens, expected.tokens), actual.html, expected.html, message);
  }
}

const MATCHER_BRAND = '3d4ef194-13be-4ccf-8dc7-862eea02c93e';

function isMatcher(obj) {
  return typeof obj === 'object' && obj !== null && MATCHER_BRAND in obj;
}

const HTMLElement = window.HTMLElement;

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
