import { UNDEFINED_REFERENCE, Template, RenderResult, SafeString, PrimitiveReference, VM, IteratorResult, clientBuilder } from "@glimmer/runtime";
import { assertNodeTagName, BasicComponent, TestEnvironment, TestModifierManager, equalTokens, stripTight, trimLines } from "@glimmer/test-helpers";
import { ConstReference } from "@glimmer/reference";
import { UpdatableReference } from "@glimmer/object-reference";
import { Opaque } from "@glimmer/util";
import { test, module, assert } from './support';

const SVG_NAMESPACE = 'http://www.w3.org/2000/svg';
const XLINK_NAMESPACE = 'http://www.w3.org/1999/xlink';
const XHTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';

let root: HTMLElement;
let env: TestEnvironment;
let self: UpdatableReference<any>;
let result: RenderResult;

function compile(template: string) {
  return env.compile(template);
}

function commonSetup() {
  env = new TestEnvironment(); // TODO: Support SimpleDOM
  root = document.getElementById('qunit-fixture')!;
}

function assertProperty<T, K extends keyof T, V extends T[K]>(obj: T | null, key: K, value: V): void {
  QUnit.assert.notStrictEqual(obj, null);
  if (obj !== null) {
    QUnit.assert.equal(obj[key], value);
  }
}

function render(template: Template, context = {}) {
  self = new UpdatableReference(context);
  env.begin();
  let cursor = { element: root, nextSibling: null };

  let templateIterator = env.renderMain(template, self, clientBuilder(env, cursor));

  let iteratorResult: IteratorResult<RenderResult>;
  do {
    iteratorResult = templateIterator.next();
  } while (!iteratorResult.done);

  result = iteratorResult.value;
  env.commit();
  assertInvariants(QUnit.assert, result);
  return result;
}

function rerender(context: any = null) {
  if (context !== null) self.update(context);
  env.begin();
  result.rerender();
  env.commit();
}

function getNodeByClassName(className: string) {
  let itemNode = root.querySelector(`.${className}`);
  assert.ok(itemNode, "Expected node with class='" + className + "'");
  return itemNode;
}

function getFirstChildOfNode(className: string) {
  let itemNode = getNodeByClassName(className);
  assert.ok(itemNode, "Expected child node of node with class='" + className + "', but no parent node found");

  let childNode = itemNode && itemNode.firstChild;
  assert.ok(childNode, "Expected child node of node with class='" + className + "', but not child node found");

  return childNode;
}

function assertInvariants(assert: Assert, result: RenderResult, msg?: string) {
  assert.strictEqual(result.firstNode(), root.firstChild, `The firstNode of the result is the same as the root's firstChild${msg ? ': ' + msg : ''}`);
  assert.strictEqual(result.lastNode(), root.lastChild, `The lastNode of the result is the same as the root's lastChild${msg ? ': ' + msg : ''}`);
}

module("[glimmer-runtime] Updating", hooks => {
  hooks.beforeEach(() => commonSetup());

  test("updating a single curly", assert => {
    let object = { value: 'hello world' };
    let template = compile('<div><p>{{value}}</p></div>');
    render(template, object);
    let valueNode: Node | null | undefined;
    if (assertNodeTagName(root.firstChild, 'div')) {
      if (assertNodeTagName(root.firstChild.firstChild, 'p')) {
        valueNode = root.firstChild.firstChild.firstChild;
      }
    }

    equalTokens(root, '<div><p>hello world</p></div>', "Initial render");

    rerender();

    equalTokens(root, '<div><p>hello world</p></div>', "no change");

    if (assertNodeTagName(root.firstChild, 'div')) {
      if (assertNodeTagName(root.firstChild.firstChild, 'p')) {
        assert.strictEqual(root.firstChild.firstChild.firstChild, valueNode, "The text node was not blown away");
      }
    }

    object.value = 'goodbye world';
    rerender();

    equalTokens(root, '<div><p>goodbye world</p></div>', "After updating and dirtying");
    if (assertNodeTagName(root.firstChild, 'div')) {
      if (assertNodeTagName(root.firstChild.firstChild, 'p')) {
        assert.strictEqual(root.firstChild.firstChild.firstChild, valueNode, "The text node was not blown away");
      }
    }
  });

  test("updating a single curly with siblings", () => {
    let value = 'brave new ';
    let context = { value };
    let template = compile('<div>hello {{value}}world</div>');
    render(template, context);

    function assertText(text1: string, text2: string, text3: string) {
      if (assertNodeTagName(root.firstChild, 'div')) {
        assertProperty(root.firstChild.firstChild, 'textContent', text1);
        assertProperty(root.firstChild.childNodes[1], 'textContent', text2);
        assertProperty(root.firstChild.lastChild, 'textContent', text3);
      }
    }

    assertText('hello ', 'brave new ', 'world');

    rerender();

    assertText('hello ', 'brave new ', 'world');

    context.value = 'another ';
    rerender();

    assertText('hello ', 'another ', 'world');

    rerender({ value });

    assertText('hello ', 'brave new ', 'world');
  });

  test("null and undefined produces empty text nodes", assert => {
    let object = { v1: null as (string | null), v2: undefined as (string | undefined) };
    let template = compile('<div><p>{{v1}}</p><p>{{v2}}</p></div>');
    render(template, object);

    let valueNode1: Node | null;
    let valueNode2: Node | null;
    if (assertNodeTagName(root.firstChild, 'div') &&
      assertNodeTagName(root.firstChild.firstChild, 'p') &&
      assertNodeTagName(root.firstChild.lastChild, 'p')) {
      valueNode1 = root.firstChild.firstChild.firstChild;
      valueNode2 = root.firstChild.lastChild.firstChild;
    }

    function assertStable() {
      if (assertNodeTagName(root.firstChild, 'div') &&
        assertNodeTagName(root.firstChild.firstChild, 'p') &&
        assertNodeTagName(root.firstChild.lastChild, 'p')) {
        assert.equal(root.firstChild.firstChild.firstChild, valueNode1, 'The text node was not blown away');
        assert.equal(root.firstChild.lastChild.firstChild, valueNode2, 'The text node was not blown away');
      }
    }

    equalTokens(root, '<div><p></p><p></p></div>', "Initial render");

    rerender();

    equalTokens(root, '<div><p></p><p></p></div>', "no change");

    assertStable();

    object.v1 = 'hello';

    rerender();

    equalTokens(root, '<div><p>hello</p><p></p></div>', "After updating and dirtying");

    assertStable();

    object.v2 = 'world';
    rerender();

    equalTokens(root, '<div><p>hello</p><p>world</p></div>', "After updating and dirtying");

    assertStable();

    object.v1 = null;
    object.v2 = undefined;
    rerender();

    equalTokens(root, '<div><p></p><p></p></div>', "Reset");

    assertStable();
  });

  test("weird paths", () => {
    let context = {
      "": "empty string",
      "1": "1",
      "undefined": "undefined",
      "null": "null",
      "true": "true",
      "false": "false",
      "this": "this",
      "foo.bar": "foo.bar",
      "nested": null as (any | null)
    };

    context.nested = context;

    function assertTextContent(expected: string) {
      if (assertNodeTagName(root.firstChild, 'div')) {
        assertProperty(root.firstChild, 'textContent', expected);
      }
    }

    let template = compile(stripTight`
      <div>
        [{{[]}}]
        [{{[1]}}]
        [{{[undefined]}}]
        [{{[null]}}]
        [{{[true]}}]
        [{{[false]}}]
        [{{[this]}}]
        [{{[foo.bar]}}]

        [{{nested.[]}}]
        [{{nested.[1]}}]
        [{{nested.[undefined]}}]
        [{{nested.[null]}}]
        [{{nested.[true]}}]
        [{{nested.[false]}}]
        [{{nested.[this]}}]
        [{{nested.[foo.bar]}}]
      </div>
    `);
    render(template, context);

    assertTextContent(stripTight`
      [empty string]
      [1]
      [undefined]
      [null]
      [true]
      [false]
      [this]
      [foo.bar]

      [empty string]
      [1]
      [undefined]
      [null]
      [true]
      [false]
      [this]
      [foo.bar]
    `);

    rerender();

    assertTextContent(stripTight`
      [empty string]
      [1]
      [undefined]
      [null]
      [true]
      [false]
      [this]
      [foo.bar]

      [empty string]
      [1]
      [undefined]
      [null]
      [true]
      [false]
      [this]
      [foo.bar]
    `);

    context[""] = "EMPTY STRING";
    context["1"] = "ONE";
    context["undefined"] = "UNDEFINED";
    context["null"] = "NULL";
    context["true"] = "TRUE";
    context["false"] = "FALSE";
    context["this"] = "THIS";
    context["foo.bar"] = "FOO.BAR";
    rerender();

    assertTextContent(stripTight`
      [EMPTY STRING]
      [ONE]
      [UNDEFINED]
      [NULL]
      [TRUE]
      [FALSE]
      [THIS]
      [FOO.BAR]

      [EMPTY STRING]
      [ONE]
      [UNDEFINED]
      [NULL]
      [TRUE]
      [FALSE]
      [THIS]
      [FOO.BAR]
    `);

    context = {
      "": "empty string",
      "1": "1",
      "undefined": "undefined",
      "null": "null",
      "true": "true",
      "false": "false",
      "this": "this",
      "foo.bar": "foo.bar",
      "nested": null
    };
    context.nested = context;

    rerender(context);

    assertTextContent(stripTight`
      [empty string]
      [1]
      [undefined]
      [null]
      [true]
      [false]
      [this]
      [foo.bar]

      [empty string]
      [1]
      [undefined]
      [null]
      [true]
      [false]
      [this]
      [foo.bar]
    `);
  });

  test("updating a single trusting curly", assert => {
    let value = '<p>hello world</p>';
    let object = { value };
    let template = compile('<div>{{{value}}}</div>');
    render(template, object);
    let valueNode: Node | null | undefined;
    if (assertNodeTagName(root.firstChild, 'div') && assertNodeTagName(root.firstChild.firstChild, 'p')) {
      valueNode = root.firstChild.firstChild.firstChild;
    }

    equalTokens(root, `<div>${value}</div>`, "Initial render");

    rerender();

    equalTokens(root, '<div><p>hello world</p></div>', "no change");
    if (assertNodeTagName(root.firstChild, 'div') && assertNodeTagName(root.firstChild.firstChild, 'p')) {
      assert.strictEqual(root.firstChild.firstChild.firstChild, valueNode, "The text node was not blown away");
    }

    object.value = '<span>goodbye world</span>';
    rerender();

    equalTokens(root, `<div>${object.value}</div>`, "After updating and dirtying");
    if (assertNodeTagName(root.firstChild, 'div') && assertNodeTagName(root.firstChild.firstChild, 'span')) {
      assert.notStrictEqual(root.firstChild.firstChild.firstChild, valueNode, "The text node was blown away");
    }

    object.value = 'a <span>good man</span> is hard to <b>fund</b>';
    rerender();

    equalTokens(root, `<div>${object.value}</div>`, "After updating with many nodes and dirtying");

    rerender({ value });

    equalTokens(root, `<div>${value}</div>`, "no change");
  });

  test("updating a single trusting curly with siblings", () => {
    let value = '<b>brave new </b>';
    let context = { value };
    let template = compile('<div>hello {{{value}}}world</div>');
    render(template, context);

    equalTokens(root, '<div>hello <b>brave new </b>world</div>', 'Initial render');

    rerender();

    equalTokens(root, '<div>hello <b>brave new </b>world</div>', 'rerender');

    context.value = 'big <b>wide</b> ';
    rerender();

    if (assertNodeTagName(root.firstChild, 'div')) {
      assertProperty(root.firstChild.firstChild, 'textContent', 'hello ');
      assertProperty(root.firstChild.childNodes[1], 'textContent', 'big ');
      assertProperty(root.firstChild.childNodes[2], 'textContent', 'wide');
      assertProperty(root.firstChild.childNodes[3], 'textContent', ' ');
      assertProperty(root.firstChild.lastChild, 'textContent', 'world');
    }

    context.value = 'another ';
    rerender();

    if (assertNodeTagName(root.firstChild, 'div')) {
      assertProperty(root.firstChild.firstChild, 'textContent', 'hello ');
      assertProperty(root.firstChild.childNodes[1], 'textContent', 'another ');
      assertProperty(root.firstChild.lastChild, 'textContent', 'world');
    }

    rerender({ value });

    equalTokens(root, '<div>hello <b>brave new </b>world</div>', 'rerender');
  });

  test("updating a single trusting curly with previous sibling", () => {
    let value = '<b>brave new </b>';
    let context = { value };
    let template = compile('<div>hello {{{value}}}</div>');
    render(template, context);

    equalTokens(root, '<div>hello <b>brave new </b></div>', 'Initial render');

    rerender();

    equalTokens(root, '<div>hello <b>brave new </b></div>', 'rerender');

    context.value = 'another ';
    rerender();

    if (assertNodeTagName(root.firstChild, 'div')) {
      assertProperty(root.firstChild.firstChild, 'textContent', 'hello ');
      assertProperty(root.firstChild.lastChild, 'textContent', 'another ');
    }

    rerender({ value });

    equalTokens(root, '<div>hello <b>brave new </b></div>', 'rerender');
  });

  // This is to catch a regression about not caching lastValue correctly
  test("Cycling between two values in a trusting curly", () => {
    let a = '<p>A</p>';
    let b = '<p>B</p>';

    let object = { value: a };
    let template = compile('<div>{{{value}}}</div>');
    render(template, object);

    equalTokens(root, '<div><p>A</p></div>', "Initial render");

    object.value = b;
    rerender();
    equalTokens(root, '<div><p>B</p></div>', "Updating");

    // Change it back
    object.value = a;
    rerender();
    equalTokens(root, '<div><p>A</p></div>', "Updating");

    // Change it back
    object.value = b;
    rerender();
    equalTokens(root, '<div><p>B</p></div>', "Updating");
  });

  test("updating a curly with a safe and unsafe string", assert => {
    interface SafeString {
      string: string;
      toHTML(): string;
      toString(): string;
    }

    let safeString = {
      string: '<p>hello world</p>',
      toHTML: function (this: SafeString) { return this.string; },
      toString: function (this: SafeString) { return this.string; }
    };
    let unsafeString = '<b>Big old world!</b>';
    let object: { value: SafeString | string; } = {
      value: safeString
    };
    let template = compile('<div>{{value}}</div>');
    render(template, object);
    let valueNode: Node | null | undefined;
    if (assertNodeTagName(root.firstChild, 'div') && assertNodeTagName(root.firstChild.firstChild, 'p')) {
      valueNode = root.firstChild.firstChild.firstChild;
    }

    equalTokens(root, '<div><p>hello world</p></div>', "Initial render");

    rerender();

    equalTokens(root, '<div><p>hello world</p></div>', "no change");

    if (assertNodeTagName(root.firstChild, 'div') && assertNodeTagName(root.firstChild.firstChild, 'p')) {
      assert.strictEqual(root.firstChild.firstChild.firstChild, valueNode, "The text node was not blown away");
    }

    object.value = unsafeString;
    rerender();

    equalTokens(root, '<div>&lt;b&gt;Big old world!&lt;/b&gt;</div>', "After replacing with unsafe string");

    if (assertNodeTagName(root.firstChild, 'div')) {
      assert.notStrictEqual(root.firstChild.firstChild, valueNode, "The text node was blown away");
    }

    object.value = safeString;
    rerender();

    equalTokens(root, '<div><p>hello world</p></div>', "original input causes no problem");
  });

  function makeSafeString(value: string): SafeString {
    return new SafeStringImpl(value);
  }

  class SafeStringImpl implements SafeString {
    constructor(private string: string) { }
    toHTML() {
      return this.string;
    }
    toString() {
      return this.string;
    }
  }

  // Test cases to matrix:
  // const helper returns const SafeString
  // non-const
  // safe string
  // unsafe string
  // swapping between safe and unsafe
  // swapping between unsafe and safe

  function makeElement(tag: string, content: string) {
    let el = document.createElement(tag);
    el.appendChild(document.createTextNode(content));
    return el;
  }

  function makeFragment(nodes: Node[]) {
    let frag = document.createDocumentFragment();
    nodes.forEach(node => frag.appendChild(node));
    return frag;
  }

  [{
    name: 'double curlies',
    template: '<div>{{value}}</div>',
    values: [{
      input: 'hello',
      expected: '<div>hello</div>',
      description: 'plain string'
    }, {
      input: '<b>hello</b>',
      expected: '<div>&lt;b&gt;hello&lt;/b&gt;</div>',
      description: 'string containing HTML'
    }, {
      input: null,
      expected: '<div></div>',
      description: 'null literal'
    }, {
      input: undefined,
      expected: '<div></div>',
      description: 'undefined literal'
    }, {
      input: makeSafeString('<b>hello</b>'),
      expected: '<div><b>hello</b></div>',
      description: 'safe string containing HTML'
    }, {
      input: makeElement('p', 'hello'),
      expected: '<div><p>hello</p></div>',
      description: 'DOM node containing an element with text'
    }, {
      input: makeFragment([makeElement('p', 'one'), makeElement('p', 'two')]),
      expected: '<div><p>one</p><p>two</p></div>',
      description: 'DOM fragment containing multiple nodes'
    }, {
      input: 'not modified',
      expected: '<div>not modified</div>',
      description: 'plain string (not modified, first render)'
    }, {
      input: 'not modified',
      expected: '<div>not modified</div>',
      description: 'plain string (not modified, second render)'
    }, {
      input: 0,
      expected: '<div>0</div>',
      description: 'number literal (0)'
    }, {
      input: true,
      expected: '<div>true</div>',
      description: 'boolean literal (true)'
    }, {
      input: {
        toString() {
          return 'I am an Object';
        }
      },
      expected: '<div>I am an Object</div>',
      description: 'object with a toString function'
    }]
  }, {
    name: 'triple curlies',
    template: '<div>{{{value}}}</div>',
    values: [{
      input: 'hello',
      expected: '<div>hello</div>',
      description: 'plain string'
    }, {
      input: '<b>hello</b>',
      expected: '<div><b>hello</b></div>',
      description: 'string containing HTML'
    }, {
      input: null,
      expected: '<div></div>',
      description: 'null literal'
    }, {
      input: undefined,
      expected: '<div></div>',
      description: 'undefined literal'
    }, {
      input: makeSafeString('<b>hello</b>'),
      expected: '<div><b>hello</b></div>',
      description: 'safe string containing HTML'
    }, {
      input: makeElement('p', 'hello'),
      expected: '<div><p>hello</p></div>',
      description: 'DOM node containing and element with text'
    }, {
      input: makeFragment([makeElement('p', 'one'), makeElement('p', 'two')]),
      expected: '<div><p>one</p><p>two</p></div>',
      description: 'DOM fragment containing multiple nodes'
    }, {
      input: 'not modified',
      expected: '<div>not modified</div>',
      description: 'plain string (not modified, first render)'
    }, {
      input: 'not modified',
      expected: '<div>not modified</div>',
      description: 'plain string (not modified, second render)'
    }, {
      input: 0,
      expected: '<div>0</div>',
      description: 'number literal (0)'
    }, {
      input: true,
      expected: '<div>true</div>',
      description: 'boolean literal (true)'
    }, {
      input: {
        toString() {
          return 'I am an Object';
        }
      },
      expected: '<div>I am an Object</div>',
      description: 'object with a toString function'
    }]
  }].forEach(config => {
    test(`updating ${config.name} produces expected result`, () => {
      let template = compile(config.template);
      let context = {
        value: undefined as (undefined | null | { toString(): string })
      };
      config.values.forEach((testCase, index) => {
        context.value = testCase.input;
        if (index === 0) {
          render(template, context);
          equalTokens(root, testCase.expected, `expected initial render (${testCase.description})`);
        } else {
          rerender();
          equalTokens(root, testCase.expected, `expected updated render (${testCase.description})`);
        }
      });
    });
  });

  test("updating a triple curly with a safe and unsafe string", assert => {
    let safeString = makeSafeString('<p>hello world</p>');
    let unsafeString = '<b>Big old world!</b>';
    let object: { value: string | SafeString; } = {
      value: safeString
    };
    let template = compile('<div>{{{value}}}</div>');
    render(template, object);

    let valueNode: Node | null | undefined;
    if (assertNodeTagName(root.firstChild, 'div') && assertNodeTagName(root.firstChild.firstChild, 'p')) {
      valueNode = root.firstChild.firstChild.firstChild;
    }

    equalTokens(root, '<div><p>hello world</p></div>', "Initial render");

    rerender();

    equalTokens(root, '<div><p>hello world</p></div>', "no change");
    if (assertNodeTagName(root.firstChild, 'div') && assertNodeTagName(root.firstChild.firstChild, 'p')) {
      assert.strictEqual(root.firstChild.firstChild.firstChild, valueNode, "The nodes were not blown away");
    }

    object.value = unsafeString;
    rerender();

    equalTokens(root, '<div><b>Big old world!</b></div>', "Normal strings may contain HTML");
    if (assertNodeTagName(root.firstChild, 'div') && assertNodeTagName(root.firstChild.firstChild, 'b')) {
      assert.notStrictEqual(root.firstChild.firstChild.firstChild, valueNode, "The nodes were blown away");
    }

    object.value = safeString;
    rerender();

    equalTokens(root, '<div><p>hello world</p></div>', "original input causes no problem");
  });

  test("triple curlies with empty string initial value", () => {
    let input = {
      value: ''
    };
    let template = compile('<div>{{{value}}}</div>');

    render(template, input);

    equalTokens(root, '<div></div>', "Initial render");

    rerender();

    equalTokens(root, '<div></div>', "no change");

    input.value = '<b>Bold and spicy</b>';
    rerender();

    equalTokens(root, '<div><b>Bold and spicy</b></div>', "markup is updated");

    input.value = '';
    rerender();

    equalTokens(root, '<div></div>', "back to empty string");
  });

  class ValueReference<T> extends ConstReference<T> {
    get(): PrimitiveReference<undefined> {
      return UNDEFINED_REFERENCE;
    }
  }

  test("double curlies with const SafeString", assert => {
    let rawString = '<b>bold</b> and spicy';

    env.registerInternalHelper('const-foobar', () => {
      return new ValueReference<Opaque>(makeSafeString(rawString));
    });

    let template = compile('<div>{{const-foobar}}</div>');
    let input = {};

    render(template, input);
    let valueNode: Node | null | undefined;
    if (assertNodeTagName(root.firstChild, 'div')) {
      valueNode = root.firstChild.firstChild;
    }

    equalTokens(root, '<div><b>bold</b> and spicy</div>', "initial render");

    rerender();

    equalTokens(root, '<div><b>bold</b> and spicy</div>', "no change");
    if (assertNodeTagName(root.firstChild, 'div')) {
      assert.strictEqual(root.firstChild.firstChild, valueNode, "The nodes were not blown away");
    }
  });

  test("double curlies with const Node", assert => {
    let rawString = '<b>bold</b> and spicy';

    env.registerInternalHelper('const-foobar', () => {
      return new ValueReference<Opaque>(document.createTextNode(rawString));
    });

    let template = compile('<div>{{const-foobar}}</div>');
    let input = {};

    render(template, input);
    let valueNode: Node | null | undefined;
    if (assertNodeTagName(root.firstChild, 'div')) {
      valueNode = root.firstChild.firstChild;
    }

    equalTokens(root, '<div>&lt;b&gt;bold&lt;/b&gt; and spicy</div>', "initial render");

    rerender();

    equalTokens(root, '<div>&lt;b&gt;bold&lt;/b&gt; and spicy</div>', "no change");
    if (assertNodeTagName(root.firstChild, 'div')) {
      assert.strictEqual(root.firstChild.firstChild, valueNode, "The node was not blown away");
    }
  });

  test("triple curlies with const SafeString", assert => {
    let rawString = '<b>bold</b> and spicy';

    env.registerInternalHelper('const-foobar', () => {
      return new ValueReference<Opaque>(makeSafeString(rawString));
    });

    let template = compile('<div>{{{const-foobar}}}</div>');
    let input = {};

    render(template, input);
    let valueNode: Node | null | undefined;
    if (assertNodeTagName(root.firstChild, 'div')) {
      valueNode = root.firstChild.firstChild;
    }

    equalTokens(root, '<div><b>bold</b> and spicy</div>', "initial render");

    rerender();

    equalTokens(root, '<div><b>bold</b> and spicy</div>', "no change");

    if (assertNodeTagName(root.firstChild, 'div')) {
      assert.strictEqual(root.firstChild.firstChild, valueNode, "The nodes were not blown away");
    }
  });

  test("triple curlies with const Node", assert => {
    let rawString = '<b>bold</b> and spicy';

    env.registerInternalHelper('const-foobar', () => {
      return new ValueReference<Opaque>(document.createTextNode(rawString));
    });

    let template = compile('<div>{{{const-foobar}}}</div>');
    let input = {};

    render(template, input);
    let valueNode = root.firstChild;

    equalTokens(root, '<div>&lt;b&gt;bold&lt;/b&gt; and spicy</div>', "initial render");

    rerender();

    equalTokens(root, '<div>&lt;b&gt;bold&lt;/b&gt; and spicy</div>', "no change");
    assert.strictEqual(root.firstChild, valueNode, "The node was not blown away");
  });

  test("helpers can add destroyables", assert => {
    let destroyable = {
      count: 0,
      destroy(this: { count: number }) {
        this.count++;
      }
    };

    env.registerInternalHelper('destroy-me', (vm: VM) => {
      vm.newDestroyable(destroyable);
      return PrimitiveReference.create('destroy me!');
    });

    let template = compile('<div>{{destroy-me}}</div>');

    render(template, {});

    equalTokens(root, '<div>destroy me!</div>', 'initial render');
    assert.strictEqual(destroyable.count, 0, 'not destroyed');

    rerender();

    equalTokens(root, '<div>destroy me!</div>', 'no change');
    assert.strictEqual(destroyable.count, 0, 'not destroyed');

    result.destroy();

    assert.strictEqual(destroyable.count, 1, 'is destroyed');
  });

  test(`helpers passed as arguments to {{#if}} are not torn down when switching between blocks`, assert => {
    let options = {
      template: '{{#if (stateful-foo)}}Yes{{/if}}',
      truthyValue: true,
      falsyValue: false
    };

    testStatefulHelper(assert, options);
  });

  test(`helpers passed as arguments to {{#unless}} are not torn down when switching between blocks`, assert => {
    let options = {
      template: '{{#unless (stateful-foo)}}Yes{{/unless}}',
      truthyValue: false,
      falsyValue: true
    };

    testStatefulHelper(assert, options);
  });

  test(`helpers passed as arguments to {{#with}} are not torn down when switching between blocks`, assert => {
    let options = {
      template: '{{#with (stateful-foo) as |unused|}}Yes{{/with}}',
      truthyValue: {},
      falsyValue: null
    };

    testStatefulHelper(assert, options);
  });

  test(`helpers passed as arguments to {{#each}} are not torn down when switching between blocks`, assert => {
    let options = {
      template: '{{#each (stateful-foo) key="@index" as |unused|}}Yes{{/each}}',
      truthyValue: [1],
      falsyValue: null
    };

    testStatefulHelper(assert, options);
  });

  test(`helpers passed as arguments to {{partial}} are not torn down when switching between blocks`, assert => {
    env.registerPartial('yasss', 'Yes');
    env.registerPartial('noooo', '');

    let options = {
      template: '{{partial (stateful-foo)}}',
      truthyValue: 'yasss',
      falsyValue: 'noooo'
    };

    testStatefulHelper(assert, options);
  });

  test(`helpers passed as arguments to {{component}} are not torn down when switching between blocks`, assert => {
    env.registerBasicComponent('XYasss', BasicComponent, '<div>Yes</div>');

    let options = {
      template: '{{component (stateful-foo)}}',
      truthyValue: 'XYasss',
      falsyValue: null
    };

    testStatefulHelper(assert, options);
  });

  test(`helpers passed as arguments to {{#in-element}} are not torn down when switching between blocks`, assert => {
    let externalElement = document.createElement('div');

    let options = {
      template: '{{#in-element (stateful-foo)}}Yes{{/in-element}}',
      truthyValue: externalElement,
      falsyValue: null,
      element: externalElement
    };

    testStatefulHelper(assert, options);
  });

  function testStatefulHelper<T, U>(assert: typeof QUnit.assert, arg1: {
    template: string;
    truthyValue: T,
    falsyValue: U,
    element?: HTMLElement
  }) {
    let {
      template,
      truthyValue,
      falsyValue,
      element = root
    } = arg1;
    let didCreate = 0;
    let didDestroy = 0;
    let reference: UpdatableReference<T | U> | undefined;

    env.registerInternalHelper('stateful-foo', (vm: VM) => {
      didCreate++;

      vm.newDestroyable({
        destroy() {
          didDestroy++;
        }
      });

      return reference = new UpdatableReference(truthyValue);
    });

    assert.strictEqual(didCreate, 0, 'didCreate: before render');
    assert.strictEqual(didDestroy, 0, 'didDestroy: before render');

    render(compile(template), {});

    assert.equal(element.textContent, 'Yes', 'initial render');
    assert.strictEqual(didCreate, 1, 'didCreate: after initial render');
    assert.strictEqual(didDestroy, 0, 'didDestroy: after initial render');

    rerender();

    assert.equal(element.textContent, 'Yes', 'after no-op re-render');
    assert.strictEqual(didCreate, 1, 'didCreate: after no-op re-render');
    assert.strictEqual(didDestroy, 0, 'didDestroy: after no-op re-render');

    reference!.update(falsyValue);
    rerender();

    assert.strictEqual(element.textContent, '', 'after switching to falsy');
    assert.strictEqual(didCreate, 1, 'didCreate: after switching to falsy');
    assert.strictEqual(didDestroy, 0, 'didDestroy: after switching to falsy');

    reference!.update(truthyValue);
    rerender();

    assert.equal(element.textContent, 'Yes', 'after reset');
    assert.strictEqual(didCreate, 1, 'didCreate: after reset');
    assert.strictEqual(didDestroy, 0, 'didDestroy: after reset');
  }

  test("updating a curly with this", assert => {
    let object = { value: 'hello world' };
    let template = compile('<div><p>{{this.value}}</p></div>');
    render(template, object);

    let valueNode: Node | null | undefined;
    if (assertNodeTagName(root.firstChild, 'div') && assertNodeTagName(root.firstChild.firstChild, 'p')) {
      valueNode = root.firstChild.firstChild.firstChild;
    }

    equalTokens(root, '<div><p>hello world</p></div>', "Initial render");

    rerender();

    equalTokens(root, '<div><p>hello world</p></div>', "no change");
    if (assertNodeTagName(root.firstChild, 'div') && assertNodeTagName(root.firstChild.firstChild, 'p')) {
      assert.strictEqual(root.firstChild.firstChild.firstChild, valueNode, "The text node was not blown away");
    }

    object.value = 'goodbye world';
    rerender();

    equalTokens(root, '<div><p>goodbye world</p></div>', "After updating and dirtying");
    if (assertNodeTagName(root.firstChild, 'div') && assertNodeTagName(root.firstChild.firstChild, 'p')) {
      assert.strictEqual(root.firstChild.firstChild.firstChild, valueNode, "The text node was not blown away");
    }
  });

  test("a simple implementation of a dirtying rerender", assert => {
    let object = { condition: true, value: 'hello world' };
    let template = compile('<div>{{#if condition}}<p>{{value}}</p>{{else}}<p>Nothing</p>{{/if}}</div>');
    render(template, object);
    let valueNode: Node | null | undefined;
    if (assertNodeTagName(root.firstChild, 'div') && assertNodeTagName(root.firstChild.firstChild, 'p')) {
      valueNode = root.firstChild.firstChild.firstChild;
    }

    equalTokens(root, '<div><p>hello world</p></div>', "Initial render");

    rerender();

    equalTokens(root, '<div><p>hello world</p></div>', "After dirtying but not updating");
    if (assertNodeTagName(root.firstChild, 'div') && assertNodeTagName(root.firstChild.firstChild, 'p')) {
      assert.strictEqual(root.firstChild.firstChild.firstChild, valueNode, "The text node was not blown away");
    }

    // Even though the #if was stable, a dirty child node is updated
    object.value = 'goodbye world';
    rerender();
    equalTokens(root, '<div><p>goodbye world</p></div>', "After updating and dirtying");
    if (assertNodeTagName(root.firstChild, 'div') && assertNodeTagName(root.firstChild.firstChild, 'p')) {
      assert.strictEqual(root.firstChild.firstChild.firstChild, valueNode, "The text node was not blown away");
    }

    object.condition = false;
    rerender();
    equalTokens(root, '<div><p>Nothing</p></div>', "And then dirtying");
    if (assertNodeTagName(root.firstChild, 'div') && assertNodeTagName(root.firstChild.firstChild, 'p')) {
      assert.notStrictEqual(root.firstChild.firstChild.firstChild, valueNode, "The text node was not blown away");
    }
  });

  test('The if helper should consider an empty array falsy', function () {
    let object: any = { condition: [], value: 'hello world' };
    let template = compile('<div>{{#if condition}}<p>{{value}}</p>{{else}}<p>Nothing</p>{{/if}}</div>');
    render(template, object);

    equalTokens(root, '<div><p>Nothing</p></div>');

    object.condition.push('thing');
    rerender();
    equalTokens(root, '<div><p>hello world</p></div>', "Initial render");
    object.condition.pop();
    rerender();
    equalTokens(root, '<div><p>Nothing</p></div>');
  });

  test("a simple implementation of a dirtying rerender without inverse", () => {
    let object = { condition: true, value: 'hello world' };
    let template = compile('<div>{{#if condition}}<p>{{value}}</p>{{/if}}</div>');
    render(template, object);

    equalTokens(root, '<div><p>hello world</p></div>', "Initial render");

    object.condition = false;

    rerender();
    equalTokens(root, '<div><!----></div>', "If the condition is false, the morph becomes empty");

    object.condition = true;

    rerender();
    equalTokens(root, '<div><p>hello world</p></div>', "If the condition is true, the morph repopulates");
  });

  test('The unless helper without inverse', function () {
    let object: any = { condition: true, value: 'hello world' };
    let template = compile('<div>{{#unless condition}}<p>{{value}}</p>{{/unless}}</div>');
    render(template, object);

    equalTokens(root, '<div><!----></div>', "Initial render");

    object.condition = false;
    rerender();
    equalTokens(root, '<div><p>hello world</p></div>', "If the condition is false, the morph becomes populated");
    object.condition = true;
    rerender();
    equalTokens(root, '<div><!----></div>', "If the condition is true, the morph unpopulated");
  });

  test('The unless helper with inverse', function () {
    let object: any = { condition: true, value: 'hello world' };
    let template = compile('<div>{{#unless condition}}<p>{{value}}</p>{{else}}<p>Nothing</p>{{/unless}}</div>');

    render(template, object);

    equalTokens(root, '<div><p>Nothing</p></div>', "Initial render");

    object.condition = false;
    rerender();
    equalTokens(root, '<div><p>hello world</p></div>', "If the condition is false, the default renders");
    object.condition = true;
    rerender();
    equalTokens(root, '<div><p>Nothing</p></div>', "If the condition is true, the inverse renders");
  });

  test('The unless helper should consider an empty array falsy', function () {
    let object: any = { condition: [], value: 'hello world' };
    let template = compile('<div>{{#unless condition}}<p>{{value}}</p>{{else}}<p>Nothing</p>{{/unless}}</div>');

    render(template, object);

    equalTokens(root, '<div><p>hello world</p></div>', "Initial render");

    object.condition.push(1);
    rerender();
    equalTokens(root, '<div><p>Nothing</p></div>', "If the condition is true, the inverse renders");

    object.condition.pop();
    rerender();
    equalTokens(root, '<div><p>hello world</p></div>', "If the condition is false, the default renders");
  });

  test("a conditional that is false on the first run", () => {
    let object = { condition: false, value: 'hello world' };
    let template = compile('<div>{{#if condition}}<p>{{value}}</p>{{/if}}</div>');
    render(template, object);

    equalTokens(root, '<div><!----></div>', "Initial render");

    object.condition = true;

    rerender();
    equalTokens(root, '<div><p>hello world</p></div>', "If the condition is true, the morph populates");

    object.condition = false;

    rerender();
    equalTokens(root, '<div><!----></div>', "If the condition is false, the morph is empty");
  });

  test("block arguments", () => {
    let template = compile("<div>{{#with person.name.first as |f|}}{{f}}{{/with}}</div>");

    let object = { person: { name: { first: "Godfrey", last: "Chan" } } };
    render(template, object);

    equalTokens(root, '<div>Godfrey</div>', "Initial render");

    object.person.name.first = "Godfreak";
    rerender();

    equalTokens(root, '<div>Godfreak</div>', "After updating");

    rerender({ person: { name: { first: "Godfrey", last: "Chan" } } });

    equalTokens(root, '<div>Godfrey</div>', "After reset");
  });

  test("block arguments should have higher presedence than helpers", () => {
    env.registerHelper('foo', () => 'foo-helper');
    env.registerHelper('bar', () => 'bar-helper');
    env.registerHelper('echo', args => args[0]);

    let template = compile(trimLines`
      <div>
        foo: "{{foo}}";
        bar: "{{bar}}";
        value: "{{value}}";
        echo foo: "{{echo foo}}";
        echo bar: "{{echo bar}}";
        echo value: "{{echo value}}";

        -----

        {{#with value as |foo|}}
          foo: "{{foo}}";
          bar: "{{bar}}";
          value: "{{value}}";
          echo foo: "{{echo foo}}";
          echo bar: "{{echo bar}}";
          echo value: "{{echo value}}";

          -----

          {{#with foo as |bar|}}
            foo: "{{foo}}";
            bar: "{{bar}}";
            value: "{{value}}";
            echo foo: "{{echo foo}}";
            echo bar: "{{echo bar}}";
            echo value: "{{echo value}}";
          {{/with}}
        {{/with}}

        -----

        {{#with value as |bar|}}
          foo: "{{foo}}";
          bar: "{{bar}}";
          value: "{{value}}";
          echo foo: "{{echo foo}}";
          echo bar: "{{echo bar}}";
          echo value: "{{echo value}}";
        {{/with}}
      </div>
    `);

    let object = { foo: 'foo-value', bar: 'bar-value', value: 'value-value' };
    render(template, object);

    equalTokens(root, trimLines`
      <div>
        foo: "foo-helper";
        bar: "bar-helper";
        value: "value-value";
        echo foo: "foo-value";
        echo bar: "bar-value";
        echo value: "value-value";

        -----

        foo: "value-value";
        bar: "bar-helper";
        value: "value-value";
        echo foo: "value-value";
        echo bar: "bar-value";
        echo value: "value-value";

        -----

        foo: "value-value";
        bar: "value-value";
        value: "value-value";
        echo foo: "value-value";
        echo bar: "value-value";
        echo value: "value-value";

        -----

        foo: "foo-helper";
        bar: "value-value";
        value: "value-value";
        echo foo: "foo-value";
        echo bar: "value-value";
        echo value: "value-value";
      </div>`, 'Initial render');

    rerender();

    equalTokens(root, trimLines`
      <div>
        foo: "foo-helper";
        bar: "bar-helper";
        value: "value-value";
        echo foo: "foo-value";
        echo bar: "bar-value";
        echo value: "value-value";

        -----

        foo: "value-value";
        bar: "bar-helper";
        value: "value-value";
        echo foo: "value-value";
        echo bar: "bar-value";
        echo value: "value-value";

        -----

        foo: "value-value";
        bar: "value-value";
        value: "value-value";
        echo foo: "value-value";
        echo bar: "value-value";
        echo value: "value-value";

        -----

        foo: "foo-helper";
        bar: "value-value";
        value: "value-value";
        echo foo: "foo-value";
        echo bar: "value-value";
        echo value: "value-value";
      </div>`, 'After no-op re-render');

    object.value = 'NEW-VALUE';
    rerender();

    equalTokens(root, trimLines`
      <div>
        foo: "foo-helper";
        bar: "bar-helper";
        value: "NEW-VALUE";
        echo foo: "foo-value";
        echo bar: "bar-value";
        echo value: "NEW-VALUE";

        -----

        foo: "NEW-VALUE";
        bar: "bar-helper";
        value: "NEW-VALUE";
        echo foo: "NEW-VALUE";
        echo bar: "bar-value";
        echo value: "NEW-VALUE";

        -----

        foo: "NEW-VALUE";
        bar: "NEW-VALUE";
        value: "NEW-VALUE";
        echo foo: "NEW-VALUE";
        echo bar: "NEW-VALUE";
        echo value: "NEW-VALUE";

        -----

        foo: "foo-helper";
        bar: "NEW-VALUE";
        value: "NEW-VALUE";
        echo foo: "foo-value";
        echo bar: "NEW-VALUE";
        echo value: "NEW-VALUE";
      </div>`, 'After update');

    rerender({ foo: 'foo-value', bar: 'bar-value', value: 'value-value' });

    equalTokens(root, trimLines`
      <div>
        foo: "foo-helper";
        bar: "bar-helper";
        value: "value-value";
        echo foo: "foo-value";
        echo bar: "bar-value";
        echo value: "value-value";

        -----

        foo: "value-value";
        bar: "bar-helper";
        value: "value-value";
        echo foo: "value-value";
        echo bar: "bar-value";
        echo value: "value-value";

        -----

        foo: "value-value";
        bar: "value-value";
        value: "value-value";
        echo foo: "value-value";
        echo bar: "value-value";
        echo value: "value-value";

        -----

        foo: "foo-helper";
        bar: "value-value";
        value: "value-value";
        echo foo: "foo-value";
        echo bar: "value-value";
        echo value: "value-value";
      </div>`, 'After reset');
  });

  test("block arguments (ensure balanced push/pop)", () => {
    let template = compile("<div>{{#with person.name.first as |f|}}{{f}}{{/with}}{{f}}</div>");

    let object = { person: { name: { first: "Godfrey", last: "Chan" } }, f: "Outer" };
    render(template, object);

    equalTokens(root, '<div>GodfreyOuter</div>', "Initial render");

    object.person.name.first = "Godfreak";
    rerender();

    equalTokens(root, '<div>GodfreakOuter</div>', "After updating");
  });

  test("block arguments cannot be accessed through {{this}}", () => {
    env.registerHelper('noop', params => params[0]);

    let template = compile(stripTight`
      <div>
        [{{#with person as |name|}}{{this.name}}{{/with}}]
        [{{#with person as |name|}}{{#with this.name as |test|}}{{test}}{{/with}}{{/with}}]
        [{{#with person as |name|}}{{#with (noop this.name) as |test|}}{{test}}{{/with}}{{/with}}]
      </div>`);

    let object = { person: "Yehuda", name: "Godfrey" };
    render(template, object);

    equalTokens(root, '<div>[Godfrey][Godfrey][Godfrey]</div>', "Initial render");

    rerender();

    equalTokens(root, '<div>[Godfrey][Godfrey][Godfrey]</div>', "Initial render");

    object.name = "Godfreak";
    rerender();

    equalTokens(root, '<div>[Godfreak][Godfreak][Godfreak]</div>', "After update");

    object.name = "Godfrey";
    rerender();

    equalTokens(root, '<div>[Godfrey][Godfrey][Godfrey]</div>', "After reset");
  });

  test("The with helper should consider an empty array falsy", () => {
    let object = { condition: [] as number[] };
    let template = compile("<div>{{#with condition as |c|}}{{c.length}}{{/with}}</div>");
    render(template, object);

    equalTokens(root, '<div><!----></div>', "Initial render");

    object.condition.push(1);
    rerender();

    equalTokens(root, '<div>1</div>', "After updating");
  });

  test("block helpers whose template has a morph at the edge", assert => {
    let template = compile("{{#identity}}{{value}}{{/identity}}");
    let object = { value: "hello world" };
    render(template, object);

    equalTokens(root, 'hello world');
    let firstNode = result.firstNode();
    assert.notStrictEqual(firstNode, null, "first node should have rendered");
    if (firstNode !== null) {
      assert.equal(firstNode.nodeType, 3, "the first node of the helper should be a text node");
      assert.equal(firstNode.nodeValue, "hello world", "its content should be hello world");

      assert.strictEqual(firstNode.nextSibling, null, "there should only be one nodes");
    }
  });

  test("clean content doesn't get blown away", assert => {
    let template = compile("<div>{{value}}</div>");
    let object = { value: "hello" };
    render(template, object);

    let firstNode = result.firstNode() as Node | null;
    let textNode: Node | null;
    if (assertNodeTagName(firstNode, 'div')) {
      textNode = firstNode.firstChild;
      assert.equal(textNode && textNode.nodeValue, "hello");
    }

    object.value = "goodbye";
    rerender();

    equalTokens(root, '<div>goodbye</div>');

    object.value = "hello";
    rerender();

    firstNode = root.firstChild;
    if (assertNodeTagName(firstNode, 'div')) {
      textNode = firstNode.firstChild;
      assert.equal(textNode && textNode.nodeValue, "hello");
    }
  });

  test("helper calls follow the normal dirtying rules", () => {
    env.registerHelper('capitalize', function (params) {
      let value = params[0];
      if (value !== null && value !== undefined && typeof value === "string") {
        return value.toUpperCase();
      }
      return;
    });

    let template = compile("<div>{{capitalize value}}</div>");
    let object = { value: "hello" };
    render(template, object);

    let div = result.firstNode() as Node | null;
    if (assertNodeTagName(div, 'div')) {
      assertProperty(div.firstChild, 'nodeValue', 'HELLO');
    }

    object.value = "goodbye";
    rerender();

    equalTokens(root, '<div>GOODBYE</div>');

    rerender();

    equalTokens(root, '<div>GOODBYE</div>');

    // Checks normalized value, not raw value
    object.value = "GoOdByE";
    rerender();

    if (assertNodeTagName(root.firstChild, 'div')) {
      assertProperty(root.firstChild.firstChild, 'nodeValue', 'GOODBYE');
    }
  });

  test("class attribute follow the normal dirtying rules", () => {
    let template = compile("<div class='{{value}}'>hello</div>");
    let object = { value: "world" };

    render(template, object);

    equalTokens(root, "<div class='world'>hello</div>", "Initial render");

    object.value = "universe";
    rerender();

    equalTokens(root, "<div class='universe'>hello</div>", "Revalidating without dirtying");

    rerender();

    equalTokens(root, "<div class='universe'>hello</div>", "Revalidating after dirtying");

    object.value = "world";
    rerender();

    equalTokens(root, "<div class='world'>hello</div>", "Revalidating after dirtying");
  });

  test("class attribute w/ concat follow the normal dirtying rules", () => {
    let template = compile("<div class='hello {{value}}'>hello</div>");
    let object = { value: "world" as (string | null) };
    render(template, object);

    equalTokens(root, "<div class='hello world'>hello</div>");

    rerender();

    equalTokens(root, "<div class='hello world'>hello</div>");

    object.value = "universe";
    rerender();

    equalTokens(root, "<div class='hello universe'>hello</div>");

    object.value = null;
    rerender();

    equalTokens(root, "<div class='hello '>hello</div>");

    object.value = "world";
    rerender();

    equalTokens(root, "<div class='hello world'>hello</div>");
  });

  test("class attribute is removed if the binding becomes null or undefined", () => {
    let template = compile("<div class={{value}}>hello</div>");
    let object: { value: any } = { value: "foo" };
    render(template, object);

    equalTokens(root, "<div class='foo'>hello</div>");

    rerender();

    equalTokens(root, "<div class='foo'>hello</div>");

    object.value = null;
    rerender();

    equalTokens(root, "<div>hello</div>");

    object.value = 0;
    rerender();

    equalTokens(root, "<div class='0'>hello</div>");

    object.value = undefined;
    rerender();

    equalTokens(root, "<div>hello</div>");

    object.value = 'foo';
    rerender();

    equalTokens(root, "<div class='foo'>hello</div>");
  });

  test("attribute nodes follow the normal dirtying rules", () => {
    let template = compile("<div data-value='{{value}}'>hello</div>");
    let object = { value: "world" as (string | null) };

    render(template, object);

    equalTokens(root, "<div data-value='world'>hello</div>", "Initial render");

    object.value = "universe";
    rerender();

    equalTokens(root, "<div data-value='universe'>hello</div>", "Revalidating without dirtying");

    rerender();

    equalTokens(root, "<div data-value='universe'>hello</div>", "Revalidating after dirtying");

    object.value = null;
    rerender();

    equalTokens(root, "<div>hello</div>", "Revalidating after dirtying");

    object.value = "world";
    rerender();

    equalTokens(root, "<div data-value='world'>hello</div>", "Revalidating after dirtying");
  });

  test("attribute nodes w/ concat follow the normal dirtying rules", () => {
    let template = compile("<div data-value='hello {{value}}'>hello</div>");
    let object = { value: "world" as (string | null) };
    render(template, object);

    equalTokens(root, "<div data-value='hello world'>hello</div>");

    rerender();

    equalTokens(root, "<div data-value='hello world'>hello</div>");

    object.value = "universe";
    rerender();

    equalTokens(root, "<div data-value='hello universe'>hello</div>");

    object.value = null;
    rerender();

    equalTokens(root, "<div data-value='hello '>hello</div>");

    object.value = "world";
    rerender();

    equalTokens(root, "<div data-value='hello world'>hello</div>");
  });

  test("attributes values are normalized correctly", () => {
    let template = compile("<div data-value={{value}}>hello</div>");
    let object = { value: { toString() { return "world"; } } };

    render(template, object);

    equalTokens(root, "<div data-value='world'>hello</div>", "Initial render");

    rerender();

    equalTokens(root, "<div data-value='world'>hello</div>", "Initial render");

    object.value = 123;
    rerender();

    equalTokens(root, "<div data-value='123'>hello</div>", "Revalidating without dirtying");

    rerender();

    equalTokens(root, "<div data-value='123'>hello</div>", "Revalidating after dirtying");

    object.value = false;
    rerender();

    equalTokens(root, "<div>hello</div>", "Revalidating after dirtying");

    rerender();

    equalTokens(root, "<div>hello</div>", "Revalidating after dirtying");

    object.value = { toString() { return "world"; } };
    rerender();

    equalTokens(root, "<div data-value='world'>hello</div>", "Revalidating after dirtying");
  });

  test("namespaced attribute nodes follow the normal dirtying rules", () => {
    let template = compile("<div xml:lang='{{lang}}'>hello</div>");
    let object = { lang: "en-us" };

    render(template, object);

    equalTokens(root, "<div xml:lang='en-us'>hello</div>", "Initial render");

    object.lang = "en-uk";
    rerender();

    equalTokens(root, "<div xml:lang='en-uk'>hello</div>", "Revalidating without dirtying");

    rerender();

    equalTokens(root, "<div xml:lang='en-uk'>hello</div>", "Revalidating after dirtying");
  });

  test("namespaced attribute nodes w/ concat follow the normal dirtying rules", () => {
    let template = compile("<div xml:lang='en-{{locale}}'>hello</div>");
    let object = { locale: "us" as (string | null) };

    render(template, object);

    equalTokens(root, "<div xml:lang='en-us'>hello</div>", "Initial render");

    rerender();

    equalTokens(root, "<div xml:lang='en-us'>hello</div>", "No-op rerender");

    object.locale = "uk";
    rerender();

    equalTokens(root, "<div xml:lang='en-uk'>hello</div>", "After update");

    object.locale = null;
    rerender();

    equalTokens(root, "<div xml:lang='en-'>hello</div>", "After updating to null");

    object.locale = "us";
    rerender();

    equalTokens(root, "<div xml:lang='en-us'>hello</div>", "After reset");
  });

  test("non-standard namespaced attribute nodes follow the normal dirtying rules", () => {
    let template = compile("<div epub:type='{{type}}'>hello</div>");
    let object = { type: "dedication" };

    render(template, object);

    equalTokens(root, "<div epub:type='dedication'>hello</div>", "Initial render");

    object.type = "backmatter";
    rerender();

    equalTokens(root, "<div epub:type='backmatter'>hello</div>", "Revalidating without dirtying");

    rerender();

    equalTokens(root, "<div epub:type='backmatter'>hello</div>", "Revalidating after dirtying");
  });

  test("non-standard namespaced attribute nodes w/ concat follow the normal dirtying rules", () => {
    let template = compile("<div epub:type='dedication {{type}}'>hello</div>");
    let object = { type: "backmatter" as (string | null) };

    render(template, object);

    equalTokens(root, "<div epub:type='dedication backmatter'>hello</div>", "Initial render");

    rerender();

    equalTokens(root, "<div epub:type='dedication backmatter'>hello</div>", "No-op rerender");

    object.type = "index";
    rerender();

    equalTokens(root, "<div epub:type='dedication index'>hello</div>", "After update");

    object.type = null;
    rerender();

    equalTokens(root, "<div epub:type='dedication '>hello</div>", "After updating to null");

    object.type = "backmatter";
    rerender();

    equalTokens(root, "<div epub:type='dedication backmatter'>hello</div>", "After reset");
  });

  test("<option selected> is normalized and updated correctly", assert => {
    function assertSelected(expectedSelected: string[], label: string) {
      let options = root.querySelectorAll('option');
      let actualSelected = [];
      for (let i = 0; i < options.length; i++) {
        let option = options[i];
        if (option.selected) {
          actualSelected.push(option.value);
        }
      }

      assert.deepEqual(actualSelected, expectedSelected, label);
    }

    let template = compile(`
      <select multiple>
        <option>0</option>
        <option selected={{one}}>1</option>
        <option selected={{two}}>2</option>
        <option selected={{three}}>3</option>
        <option selected={{four}}>4</option>
        <option selected={{five}}>5</option>
      </select>`);

    let object = {
      one: true,
      two: 'is-true' as (string | boolean),
      three: undefined as (undefined | null | boolean),
      four: null as (undefined | null | string),
      five: false
    };

    render(template, object);

    let expectedInitialTokens = `
      <select multiple="">
        <option>0</option>
        <option>1</option>
        <option>2</option>
        <option>3</option>
        <option>4</option>
        <option>5</option>
      </select>`;

    equalTokens(root, expectedInitialTokens, 'initial render tokens');
    assertSelected(['1', '2'], 'selection after initial render');

    rerender();

    assertSelected(['1', '2'], 'selection after no-op re-render');

    object.one = false;
    object.two = false;
    rerender();

    assertSelected([], 'selection after update to all falsey');

    object.three = true;
    object.four = 'asdf';
    rerender();

    assertSelected(['3', '4'], 'selection after update 3 & 4 to truthy');

    object.three = null;
    object.four = undefined;
    rerender();

    assertSelected([], 'selection after update 3 & 4 back to falsey');
  });

  test("top-level bounds are correct when swapping order", assert => {
    let template = compile("{{#each list key='key' as |item|}}{{item.name}}{{/each}}");

    let tom = { key: "1", name: "Tom Dale", "class": "tomdale" };
    let yehuda = { key: "2", name: "Yehuda Katz", "class": "wycats" };
    let object = { list: [tom, yehuda] };

    render(template, object);
    assertInvariants(assert, result, "initial render");

    rerender();
    assertInvariants(assert, result, "after no-op rerender");

    object = { list: [yehuda, tom] };
    rerender(object);
    assertInvariants(assert, result, "after reordering");

    object = { list: [tom] };
    rerender(object);
    assertInvariants(assert, result, "after deleting from the front");

    object = { list: [] };
    rerender(object);
    assertInvariants(assert, result, "after emptying the list");
  });

  test("top-level bounds are correct when toggling conditionals", assert => {
    let template = compile("{{#if item}}{{item.name}}{{/if}}");

    let tom = { name: "Tom Dale" };
    let yehuda = { name: "Yehuda Katz" };
    let object = { item: tom as (typeof tom | null) };

    render(template, object);
    assertInvariants(assert, result, "initial render");

    rerender();
    assertInvariants(assert, result, "after no-op rerender");

    object = { item: yehuda };
    rerender(object);
    assertInvariants(assert, result, "after replacement");

    object = { item: null };
    rerender(object);
    assertInvariants(assert, result, "after nulling");
  });

  test("top-level bounds are correct when changing innerHTML", assert => {
    let template = compile("{{{html}}}");

    let object = { html: "<b>inner</b>-<b>before</b>" };

    render(template, object);
    assertInvariants(assert, result, "initial render");

    rerender();
    assertInvariants(assert, result, "after no-op rerender");

    object = { html: "<p>inner-after</p>" };
    rerender(object);
    assertInvariants(assert, result, "after replacement");

    object = { html: "" };
    rerender(object);
    assertInvariants(assert, result, "after emptying");
  });

  testEachHelper(
    "An implementation of #each using block params",
    "<ul>{{#each list key='key' as |item|}}<li class='{{item.class}}'>{{item.name}}</li>{{/each}}</ul>"
  );

  test('The each helper with inverse', assert => {
    let object = { list: [] as any[] };
    let template = compile(`<ul>{{#each list key='name' as |item|}}<li class="{{item.class}}">{{item.name}}</li>{{else}}<li class="none">none</li>{{/each}}</ul>`);

    render(template, object);

    let itemNode = getNodeByClassName('none');
    let textNode = getFirstChildOfNode('none');

    equalTokens(root, `<ul><li class="none">none</li></none`);

    rerender(object);
    assertStableNodes('none', 'after no-op rerender');

    object = { list: [{ name: 'Foo Bar', class: "foobar" }] };
    rerender(object);

    equalTokens(root, '<ul><li class="foobar">Foo Bar</li></ul>');

    object = { list: [] };
    rerender(object);

    equalTokens(root, '<ul><li class="none">none</li></ul>');

    function assertStableNodes(className: string, message: string) {
      assert.strictEqual(getNodeByClassName(className), itemNode, "The item node has not changed " + message);
      assert.strictEqual(getFirstChildOfNode(className), textNode, "The text node has not changed " + message);
    }
  });

  test('The each helper yields the index of the current item current item when using the @index key', assert => {
    let tom = { name: "Tom Dale", "class": "tomdale" };
    let yehuda = { name: "Yehuda Katz", "class": "wycats" };
    let object = { list: [tom, yehuda] };
    let template = compile("<ul>{{#each list key='@index' as |item index|}}<li class='{{item.class}}'>{{item.name}}<p class='index-{{index}}'>{{index}}</p></li>{{/each}}</ul>");

    render(template, object);

    let itemNode = getNodeByClassName('tomdale');
    let indexNode = getNodeByClassName('index-0');
    let nameNode = getFirstChildOfNode('tomdale');

    equalTokens(root, "<ul><li class='tomdale'>Tom Dale<p class='index-0'>0</p></li><li class='wycats'>Yehuda Katz<p class='index-1'>1</p></li></ul>", "Initial render");

    rerender();
    assertStableNodes('tomdale', 0, 'after no-op rerender');
    equalTokens(root, "<ul><li class='tomdale'>Tom Dale<p class='index-0'>0</p></li><li class='wycats'>Yehuda Katz<p class='index-1'>1</p></li></ul>", "After no-op render");

    rerender();
    assertStableNodes('tomdale', 0, 'after non-dirty rerender');
    equalTokens(root, "<ul><li class='tomdale'>Tom Dale<p class='index-0'>0</p></li><li class='wycats'>Yehuda Katz<p class='index-1'>1</p></li></ul>", "After non-dirty render");

    object = { list: [yehuda, tom] };
    rerender(object);
    equalTokens(root, "<ul><li class='wycats'>Yehuda Katz<p class='index-0'>0</p></li><li class='tomdale'>Tom Dale<p class='index-1'>1</p></li></ul>", "After changing list order");
    assert.strictEqual(getNodeByClassName(`index-0`), indexNode, "The index node has not changed after changing list order");

    object = {
      list: [
        { name: "Martin Muñoz", class: "mmun" },
        { name: "Kris Selden", class: "krisselden" }
      ]
    };
    rerender(object);
    assertStableNodes('mmun', 0, "after changing the list entries, but with stable keys");
    equalTokens(
      root,
      `<ul><li class='mmun'>Martin Muñoz<p class='index-0'>0</p></li><li class='krisselden'>Kris Selden<p class='index-1'>1</p></li></ul>`,
      `After changing the list entries, but with stable keys`
    );

    object = {
      list: [
        { name: "Martin Muñoz", class: "mmun" },
        { name: "Kristoph Selden", class: "krisselden" },
        { name: "Matthew Beale", class: "mixonic" }
      ]
    };

    rerender(object);
    assertStableNodes('mmun', 0, "after adding an additional entry");
    equalTokens(
      root,
      stripTight`<ul>
        <li class='mmun'>Martin Muñoz<p class='index-0'>0</p></li>
        <li class='krisselden'>Kristoph Selden<p class='index-1'>1</p></li>
        <li class='mixonic'>Matthew Beale<p class='index-2'>2</p></li></ul>`,
      `After adding an additional entry`
    );

    object = {
      list: [
        { name: "Martin Muñoz", class: "mmun" },
        { name: "Matthew Beale", class: "mixonic" }
      ]
    };

    rerender(object);
    assertStableNodes('mmun', 0, "after removing the middle entry");
    equalTokens(
      root,
      "<ul><li class='mmun'>Martin Muñoz<p class='index-0'>0</p></li><li class='mixonic'>Matthew Beale<p class='index-1'>1</p></li></ul>",
      "after removing the middle entry"
    );

    object = {
      list: [
        { name: "Martin Muñoz", class: "mmun" },
        { name: "Stefan Penner", class: "stefanpenner" },
        { name: "Robert Jackson", class: "rwjblue" }
      ]
    };

    rerender(object);
    assertStableNodes('mmun', 0, "after adding two more entries");
    equalTokens(
      root,
      stripTight`<ul>
        <li class='mmun'>Martin Muñoz<p class='index-0'>0</p></li>
        <li class='stefanpenner'>Stefan Penner<p class='index-1'>1</p></li>
        <li class='rwjblue'>Robert Jackson<p class='index-2'>2</p></li></ul>`,
      `After adding two more entries`
    );

    // New node for stability check
    itemNode = getNodeByClassName('rwjblue');
    nameNode = getFirstChildOfNode('rwjblue');
    indexNode = getNodeByClassName('index-2');

    object = {
      list: [
        { name: "Robert Jackson", class: "rwjblue" }
      ]
    };

    rerender(object);
    equalTokens(root, "<ul><li class='rwjblue'>Robert Jackson<p class='index-0'>0</p></li></ul>", "After removing two entries");

    object = {
      list: [
        { name: "Martin Muñoz", class: "mmun" },
        { name: "Stefan Penner", class: "stefanpenner" },
        { name: "Robert Jackson", class: "rwjblue" }
      ]
    };

    rerender(object);
    equalTokens(
      root,
      stripTight`<ul>
        <li class='mmun'>Martin Muñoz<p class='index-0'>0</p></li>
        <li class='stefanpenner'>Stefan Penner<p class='index-1'>1</p></li>
        <li class='rwjblue'>Robert Jackson<p class='index-2'>2</p></li></ul>`,
      `After adding back entries`
    );

    // New node for stability check
    itemNode = getNodeByClassName('mmun');
    nameNode = getFirstChildOfNode('mmun');
    indexNode = getNodeByClassName('index-0');

    object = {
      list: [
        { name: "Martin Muñoz", class: "mmun" }
      ]
    };

    rerender(object);
    assertStableNodes('mmun', 0, "after removing from the back");
    equalTokens(root, "<ul><li class='mmun'>Martin Muñoz<p class='index-0'>0</p></li></ul>", "After removing from the back");

    object = { list: [] };

    rerender(object);
    if (assertNodeTagName(root.firstChild, 'ul')) {
      assert.strictEqual(root.firstChild.firstChild && root.firstChild.firstChild.nodeType, 8, "there are no li's after removing the remaining entry");
      equalTokens(root, "<ul><!----></ul>", "After removing the remaining entries");
    }

    function assertStableNodes(className: string, index: number, message: string) {
      assert.strictEqual(getNodeByClassName(className), itemNode, "The item node has not changed " + message);
      assert.strictEqual(getNodeByClassName(`index-${index}`), indexNode, "The index node has not changed " + message);
      assert.strictEqual(getFirstChildOfNode(className), nameNode, "The name node has not changed " + message);
    }
  });

  test('The each helper yields the index of the current item when using a non-@index key', assert => {
    let tom = { key: "1", name: "Tom Dale", class: "tomdale" };
    let yehuda = { key: "2", name: "Yehuda Katz", class: "wycats" };
    let object = { list: [tom, yehuda] };
    let template = compile("<ul>{{#each list key='key' as |item index|}}<li class='{{item.class}}'>{{item.name}}<p class='index-{{index}}'>{{index}}</p></li>{{/each}}</ul>");

    render(template, object);

    let itemNode = getNodeByClassName('tomdale');
    let indexNode = getNodeByClassName('index-0');
    let nameNode = getFirstChildOfNode('tomdale');

    equalTokens(root, "<ul><li class='tomdale'>Tom Dale<p class='index-0'>0</p></li><li class='wycats'>Yehuda Katz<p class='index-1'>1</p></li></ul>", "Initial render");

    rerender();
    assertStableNodes('tomdale', 0, 'after no-op rerender');
    equalTokens(root, "<ul><li class='tomdale'>Tom Dale<p class='index-0'>0</p></li><li class='wycats'>Yehuda Katz<p class='index-1'>1</p></li></ul>", "After no-op render");

    rerender();
    assertStableNodes('tomdale', 0, 'after non-dirty rerender');
    equalTokens(root, "<ul><li class='tomdale'>Tom Dale<p class='index-0'>0</p></li><li class='wycats'>Yehuda Katz<p class='index-1'>1</p></li></ul>", "After non-dirty render");

    object = { list: [yehuda, tom] };
    rerender(object);
    equalTokens(root, "<ul><li class='wycats'>Yehuda Katz<p class='index-0'>0</p></li><li class='tomdale'>Tom Dale<p class='index-1'>1</p></li></ul>", "After changing list order");
    assert.strictEqual(getNodeByClassName('index-1'), indexNode, "The index node has been moved after changing list order");

    object = {
      list: [
        { key: "1", name: "Martin Muñoz", class: "mmun" },
        { key: "2", name: "Kris Selden", class: "krisselden" }
      ]
    };
    rerender(object);
    assertStableNodes('mmun', 0, "after changing the list entries, but with stable keys");
    equalTokens(
      root,
      `<ul><li class='mmun'>Martin Muñoz<p class='index-0'>0</p></li><li class='krisselden'>Kris Selden<p class='index-1'>1</p></li></ul>`,
      `After changing the list entries, but with stable keys`
    );

    object = {
      list: [
        { key: "1", name: "Martin Muñoz", class: "mmun" },
        { key: "2", name: "Kristoph Selden", class: "krisselden" },
        { key: "3", name: "Matthew Beale", class: "mixonic" }
      ]
    };

    rerender(object);
    assertStableNodes('mmun', 0, "after adding an additional entry");
    equalTokens(
      root,
      stripTight`<ul>
        <li class='mmun'>Martin Muñoz<p class='index-0'>0</p></li>
        <li class='krisselden'>Kristoph Selden<p class='index-1'>1</p></li>
        <li class='mixonic'>Matthew Beale<p class='index-2'>2</p></li></ul>`,
      `After adding an additional entry`
    );

    object = {
      list: [
        { key: "1", name: "Martin Muñoz", class: "mmun" },
        { key: "3", name: "Matthew Beale", class: "mixonic" }
      ]
    };

    rerender(object);
    assertStableNodes('mmun', 0, "after removing the middle entry");
    equalTokens(
      root,
      "<ul><li class='mmun'>Martin Muñoz<p class='index-0'>0</p></li><li class='mixonic'>Matthew Beale<p class='index-1'>1</p></li></ul>",
      "after removing the middle entry"
    );

    object = {
      list: [
        { key: "1", name: "Martin Muñoz", class: "mmun" },
        { key: "4", name: "Stefan Penner", class: "stefanpenner" },
        { key: "5", name: "Robert Jackson", class: "rwjblue" }
      ]
    };

    rerender(object);
    assertStableNodes('mmun', 0, "after adding two more entries");
    equalTokens(
      root,
      stripTight`<ul>
        <li class='mmun'>Martin Muñoz<p class='index-0'>0</p></li>
        <li class='stefanpenner'>Stefan Penner<p class='index-1'>1</p></li>
        <li class='rwjblue'>Robert Jackson<p class='index-2'>2</p></li></ul>`,
      `After adding two more entries`
    );

    // New node for stability check
    itemNode = getNodeByClassName('rwjblue');
    nameNode = getFirstChildOfNode('rwjblue');
    indexNode = getNodeByClassName('index-2');

    object = {
      list: [
        { key: "5", name: "Robert Jackson", class: "rwjblue" }
      ]
    };

    rerender(object);
    assertStableNodes('rwjblue', 0, "after removing two entries");
    equalTokens(root, "<ul><li class='rwjblue'>Robert Jackson<p class='index-0'>0</p></li></ul>", "After removing two entries");

    object = {
      list: [
        { key: "1", name: "Martin Muñoz", class: "mmun" },
        { key: "4", name: "Stefan Penner", class: "stefanpenner" },
        { key: "5", name: "Robert Jackson", class: "rwjblue" }
      ]
    };

    rerender(object);
    assertStableNodes('rwjblue', 2, "after adding back entries");
    equalTokens(
      root,
      stripTight`<ul>
        <li class='mmun'>Martin Muñoz<p class='index-0'>0</p></li>
        <li class='stefanpenner'>Stefan Penner<p class='index-1'>1</p></li>
        <li class='rwjblue'>Robert Jackson<p class='index-2'>2</p></li></ul>`,
      `After adding back entries`
    );

    // New node for stability check
    itemNode = getNodeByClassName('mmun');
    nameNode = getFirstChildOfNode('mmun');
    indexNode = getNodeByClassName('index-0');

    object = {
      list: [
        { key: "1", name: "Martin Muñoz", class: "mmun" }
      ]
    };

    rerender(object);
    assertStableNodes('mmun', 0, "after removing from the back");
    equalTokens(root, "<ul><li class='mmun'>Martin Muñoz<p class='index-0'>0</p></li></ul>", "After removing from the back");

    object = { list: [] };

    rerender(object);
    if (assertNodeTagName(root.firstChild, 'ul')) {
      assert.strictEqual(root.firstChild.firstChild && root.firstChild.firstChild.nodeType, 8, "there are no li's after removing the remaining entry");
    }
    equalTokens(root, "<ul><!----></ul>", "After removing the remaining entries");

    function assertStableNodes(className: string, index: number, message: string) {
      assert.strictEqual(getNodeByClassName(className), itemNode, "The item node has not changed " + message);
      assert.strictEqual(getNodeByClassName(`index-${index}`), indexNode, "The index node has not changed " + message);
      assert.strictEqual(getFirstChildOfNode(className), nameNode, "The name node has not changed " + message);
    }
  });

  // TODO: port https://github.com/emberjs/ember.js/pull/14082

  function testEachHelper(testName: string, templateSource: string, testMethod = QUnit.test) {
    testMethod(testName, assert => {
      let template = compile(templateSource);
      let tom = { key: "1", name: "Tom Dale", class: "tomdale" };
      let yehuda = { key: "2", name: "Yehuda Katz", class: "wycats" };
      let object = { list: [tom, yehuda] };

      render(template, object);

      let itemNode = getNodeByClassName('tomdale');
      let nameNode = getFirstChildOfNode('tomdale');

      equalTokens(root, "<ul><li class='tomdale'>Tom Dale</li><li class='wycats'>Yehuda Katz</li></ul>", "Initial render");

      rerender();
      assertStableNodes('tomdale', "after no-op rerender");
      equalTokens(root, "<ul><li class='tomdale'>Tom Dale</li><li class='wycats'>Yehuda Katz</li></ul>", "After no-op re-render");

      rerender();
      assertStableNodes('tomdale', "after non-dirty rerender");
      equalTokens(root, "<ul><li class='tomdale'>Tom Dale</li><li class='wycats'>Yehuda Katz</li></ul>", "After non-dirty re-render");

      object = { list: [yehuda, tom] };
      rerender(object);
      assertStableNodes('tomdale', "after changing the list order");
      equalTokens(root, "<ul><li class='wycats'>Yehuda Katz</li><li class='tomdale'>Tom Dale</li></ul>", "After changing the list order");

      function assertStableNodes(className: string, message: string) {
        assert.strictEqual(getNodeByClassName(className), itemNode, "The item node has not changed " + message);
        assert.strictEqual(getFirstChildOfNode(className), nameNode, "The name node has not changed " + message);
      }
    });
  }
});

QUnit.module("Updating SVG", hooks => {
  hooks.beforeEach(() => commonSetup());

  test("HTML namespace from root element is continued to child templates", assert => {
    let object = { hasCircle: true };
    let template = compile('<svg>{{#if hasCircle}}<circle />{{/if}}</svg>');
    render(template, object);

    function assertNamespaces() {
      if (assertNodeTagName(root.firstChild, 'svg')) {
        assert.equal(root.firstChild.namespaceURI, SVG_NAMESPACE);
        if (assertNodeTagName(root.firstChild.firstChild, 'circle')) {
          assert.equal(root.firstChild.firstChild.namespaceURI, SVG_NAMESPACE);
        }
      }
    }

    equalTokens(root, "<svg><circle /></svg>");
    assertNamespaces();

    rerender();

    equalTokens(root, "<svg><circle /></svg>");
    assertNamespaces();

    object.hasCircle = false;
    rerender();

    equalTokens(root, "<svg><!----></svg>");

    rerender({ hasCircle: true });

    equalTokens(root, "<svg><circle /></svg>");
    assertNamespaces();
  });

  test("root <foreignObject> tag is SVG namespaced", assert => {
    let object = { hasForeignObject: true };
    let template = compile('{{#if hasForeignObject}}<foreignObject><div></div></foreignObject>{{/if}}');

    let parent = root;
    let svg = document.createElementNS(SVG_NAMESPACE, 'svg');
    root.appendChild(svg);
    root = svg as any;

    render(template, object);

    function assertNamespaces() {
      if (assertNodeTagName(svg.firstChild, 'foreignobject')) {
        assert.equal(svg.firstChild.namespaceURI, SVG_NAMESPACE);
        if (assertNodeTagName(svg.firstChild.firstChild, 'div')) {
          assert.equal(svg.firstChild.firstChild.namespaceURI, XHTML_NAMESPACE);
        }
      }
    }

    equalTokens(parent, "<svg><foreignObject><div></div></foreignObject></svg>");
    assertNamespaces();

    rerender();

    equalTokens(parent, "<svg><foreignObject><div></div></foreignObject></svg>");
    assertNamespaces();

    object.hasForeignObject = false;
    rerender();

    equalTokens(parent, "<svg><!----></svg>");

    rerender({ hasForeignObject: true });

    equalTokens(parent, "<svg><foreignObject><div></div></foreignObject></svg>");
    assertNamespaces();
  });

  test("elements nested inside <foreignObject> have an XHTML namespace", assert => {
    let object = { hasDiv: true };
    let template = compile('<svg><foreignObject>{{#if hasDiv}}<div></div>{{/if}}</foreignObject></svg>');
    render(template, object);

    function assertNamespaces() {
      if (assertNodeTagName(root.firstChild, 'svg')) {
        assert.equal(root.firstChild.namespaceURI, SVG_NAMESPACE);
        if (assertNodeTagName(root.firstChild.firstChild, 'foreignobject')) {
          assert.equal(root.firstChild.firstChild.namespaceURI, SVG_NAMESPACE);
          if (assertNodeTagName(root.firstChild.firstChild.firstChild, 'div')) {
            assert.equal(root.firstChild.firstChild.firstChild.namespaceURI, XHTML_NAMESPACE);
          }
        }
      }
    }

    equalTokens(root, "<svg><foreignObject><div></div></foreignObject></svg>");
    assertNamespaces();

    rerender();

    equalTokens(root, "<svg><foreignObject><div></div></foreignObject></svg>");
    assertNamespaces();

    object.hasDiv = false;
    rerender();

    equalTokens(root, "<svg><foreignObject><!----></foreignObject></svg>");

    rerender({ hasDiv: true });

    equalTokens(root, "<svg><foreignObject><div></div></foreignObject></svg>");
    assertNamespaces();
  });

  test("Namespaced attribute with a quoted expression", assert => {
    let title = 'svg-title';
    let context = { title };
    let template = compile('<svg xlink:title="{{title}}">content</svg>');
    render(template, context);

    function assertNamespaces() {
      if (assertNodeTagName(root.firstChild, 'svg')) {
        assert.equal(root.firstChild.namespaceURI, SVG_NAMESPACE);
        let attr = root.firstChild.attributes[0];
        assert.equal(attr.namespaceURI, XLINK_NAMESPACE);
      }
    }

    equalTokens(root, `<svg xlink:title="${title}">content</svg>`);
    assertNamespaces();

    rerender();

    equalTokens(root, `<svg xlink:title="${title}">content</svg>`);
    assertNamespaces();

    context.title = 'mmun';
    rerender();

    equalTokens(root, `<svg xlink:title="${context.title}">content</svg>`);
    assertNamespaces();

    rerender({ title });

    equalTokens(root, `<svg xlink:title="${title}">content</svg>`);
    assertNamespaces();
  });

  test("<svg> tag and expression as sibling", assert => {
    let name = 'svg-title';
    let context: { name: string | null; } = { name };
    let template = compile('<svg></svg>{{name}}');
    render(template, context);

    function assertNamespace() {
      if (assertNodeTagName(root.firstChild, 'svg')) {
        assert.equal(root.firstChild.namespaceURI, SVG_NAMESPACE);
      }
    }

    equalTokens(root, `<svg></svg>${name}`);
    assertNamespace();

    rerender();

    equalTokens(root, `<svg></svg>${name}`);
    assertNamespace();

    context.name = null;
    rerender();

    equalTokens(root, `<svg></svg>`);
    assertNamespace();

    rerender({ name });

    equalTokens(root, `<svg></svg>${name}`);
    assertNamespace();
  });

  test("<svg> tag and unsafe expression as sibling", assert => {
    let name = '<i>Biff</i>';
    let context = { name };
    let template = compile('<svg></svg>{{{name}}}');
    render(template, context);

    function assertNamespaces() {
      if (assertNodeTagName(root.firstChild, 'svg')) {
        assert.equal(root.firstChild.namespaceURI, SVG_NAMESPACE);
      }
      if (context.name === name && assertNodeTagName(root.lastChild, 'i')) {
        assert.equal(root.lastChild.namespaceURI, XHTML_NAMESPACE);
      }
    }

    equalTokens(root, `<svg></svg>${name}`);
    assertNamespaces();

    rerender();

    equalTokens(root, `<svg></svg>${name}`);
    assertNamespaces();

    context.name = 'ef4';
    rerender();

    equalTokens(root, `<svg></svg>${context.name}`);
    assertNamespaces();

    rerender({ name });

    equalTokens(root, `<svg></svg>${name}`);
    assertNamespaces();
  });

  test("unsafe expression nested inside a namespace", assert => {
    let content = '<path></path>';
    let context = { content };
    let template = compile('<svg>{{{content}}}</svg><div></div>');
    render(template, context);

    function assertNamespaces(callback: (svg: SVGSVGElement) => void) {
      if (assertNodeTagName(root.firstChild, 'svg')) {
        assert.equal(root.firstChild.namespaceURI, SVG_NAMESPACE);
        callback(root.firstChild);
      }
      if (assertNodeTagName(root.lastChild, 'div')) {
        assert.equal(root.lastChild.namespaceURI, XHTML_NAMESPACE);
      }
    }

    equalTokens(root, `<svg>${content}</svg><div></div>`);
    assertNamespaces(svg => {
      if (assertNodeTagName(svg.firstChild, 'path')) {
        assert.equal(svg.firstChild.namespaceURI, SVG_NAMESPACE, 'initial render path has SVG namespace');
      }
    });

    rerender();

    equalTokens(root, `<svg>${content}</svg><div></div>`);
    assertNamespaces(svg => {
      if (assertNodeTagName(svg.firstChild, 'path')) {
        assert.equal(svg.firstChild.namespaceURI, SVG_NAMESPACE, 'path has SVG namespace');
      }
    });

    context.content = '<foreignObject><span></span></foreignObject>';
    rerender();

    equalTokens(root, `<svg>${context.content}</svg><div></div>`);
    assertNamespaces(svg => {
      if (assertNodeTagName(svg.firstChild, 'foreignobject')) {
        assert.equal(svg.firstChild.namespaceURI, SVG_NAMESPACE, 'initial render path has SVG namespace');
        if (assertNodeTagName(svg.firstChild.firstChild, 'span')) {
          assert.equal(svg.firstChild.firstChild.namespaceURI, XHTML_NAMESPACE, 'span has XHTML NS');
        }
      }
    });

    context.content = '<path></path><circle></circle>';
    rerender();

    equalTokens(root, `<svg>${context.content}</svg><div></div>`);
    assertNamespaces(svg => {
      if (assertNodeTagName(svg.firstChild, 'path')) {
        assert.equal(svg.firstChild.namespaceURI, SVG_NAMESPACE, 'initial render path has SVG namespace');
      }
      if (assertNodeTagName(svg.lastChild, 'circle')) {
        assert.equal(svg.lastChild.namespaceURI, SVG_NAMESPACE, 'initial render path has SVG namespace');
      }
    });

    rerender({ content });

    equalTokens(root, `<svg>${content}</svg><div></div>`);
    assertNamespaces(svg => {
      if (assertNodeTagName(svg.firstChild, 'path')) {
        assert.equal(svg.firstChild.namespaceURI, SVG_NAMESPACE, 'initial render path has SVG namespace');
      }
    });
  });

  test("expression nested inside a namespace", assert => {
    let content = 'Milly';
    let context = { content };
    let template = compile('<div><svg>{{content}}</svg></div>');
    render(template, context);

    function assertNamespaces() {
      if (assertNodeTagName(root.firstChild, 'div')) {
        assert.equal(root.firstChild.namespaceURI, XHTML_NAMESPACE);
        if (assertNodeTagName(root.firstChild.firstChild, 'svg')) {
          assert.equal(root.firstChild.firstChild.namespaceURI, SVG_NAMESPACE);
        }
      }
    }

    equalTokens(root, `<div><svg>${content}</svg></div>`);
    assertNamespaces();

    rerender();

    equalTokens(root, `<div><svg>${content}</svg></div>`);
    assertNamespaces();

    context.content = 'Moe';
    rerender();

    equalTokens(root, `<div><svg>${context.content}</svg></div>`);
    assertNamespaces();

    rerender({ content });

    equalTokens(root, `<div><svg>${content}</svg></div>`);
    assertNamespaces();
  });

  test("expression nested inside a namespaced root element", assert => {
    let content = 'Maurice';
    let context: { content: string | null } = { content };
    let template = compile('<svg>{{content}}</svg>');
    render(template, context);

    function assertSvg(callback?: (svg: SVGSVGElement) => void) {
      if (assertNodeTagName(root.firstChild, 'svg')) {
        assert.equal(root.firstChild.namespaceURI, SVG_NAMESPACE);
        if (callback) callback(root.firstChild);
      }
    }

    equalTokens(root, `<svg>${content}</svg>`);
    assertSvg();

    rerender();

    equalTokens(root, `<svg>${content}</svg>`);
    assertSvg();

    context.content = null;
    rerender();

    assertSvg(svg => {
      assert.strictEqual(svg.firstChild && svg.firstChild.textContent, '');
    });

    rerender({ content });

    equalTokens(root, `<svg>${content}</svg>`);
    assertSvg();
  });

  test("HTML namespace is created in child templates", assert => {
    let isTrue = true;
    let context = { isTrue };
    let template = compile('{{#if isTrue}}<svg></svg>{{else}}<div><svg></svg></div>{{/if}}');
    render(template, context);
    function assertNamespaces(isTrue: boolean) {
      if (isTrue) {
        if (assertNodeTagName(root.firstChild, 'svg')) {
          assert.equal(root.firstChild.namespaceURI, SVG_NAMESPACE);
        }
      } else {
        if (assertNodeTagName(root.firstChild, 'div')) {
          assert.equal(root.firstChild.namespaceURI, XHTML_NAMESPACE);
          if (assertNodeTagName(root.firstChild.firstChild, 'svg')) {
            assert.equal(root.firstChild.firstChild.namespaceURI, SVG_NAMESPACE);
          }
        }
      }
    }

    equalTokens(root, `<svg></svg>`);
    assertNamespaces(true);

    rerender();

    equalTokens(root, `<svg></svg>`);
    assertNamespaces(true);

    context.isTrue = false;
    rerender();

    equalTokens(root, `<div><svg></svg></div>`);
    assertNamespaces(false);

    rerender({ isTrue });

    equalTokens(root, `<svg></svg>`);
    assertNamespaces(true);
  });

  test("HTML namespace is continued to child templates", assert => {
    let isTrue = true;
    let context = { isTrue };
    let template = compile('<div><svg>{{#if isTrue}}<circle />{{/if}}</svg></div>');
    render(template, context);

    function assertNamespaces(isTrue: boolean) {
      if (assertNodeTagName(root.firstChild, 'div')) {
        assert.equal(root.firstChild.namespaceURI, XHTML_NAMESPACE);
        if (assertNodeTagName(root.firstChild.firstChild, 'svg')) {
          assert.equal(root.firstChild.firstChild.namespaceURI, SVG_NAMESPACE);
          if (isTrue && assertNodeTagName(root.firstChild.firstChild.firstChild, 'circle')) {
            assert.equal(root.firstChild.firstChild.firstChild.namespaceURI, SVG_NAMESPACE);
          }
        }
      }
    }

    equalTokens(root, `<div><svg><circle /></svg></div>`);

    assertNamespaces(true);

    rerender();

    equalTokens(root, `<div><svg><circle /></svg></div>`);
    assertNamespaces(true);

    context.isTrue = false;
    rerender();

    equalTokens(root, `<div><svg><!----></svg></div>`);
    assertNamespaces(false);

    rerender({ isTrue });

    equalTokens(root, `<div><svg><circle /></svg></div>`);
    assertNamespaces(true);
  });
});

QUnit.module("Updating Element Modifiers", hooks => {
  hooks.beforeEach(() => commonSetup());

  test("Updating a element modifier", assert => {
    let manager = new TestModifierManager();
    env.registerModifier('foo', manager);

    let template = compile('<div><div {{foo bar baz=fizz}}></div></div>');
    let input = {
      bar: 'Super Metroid'
    };

    render(template, input);

    let valueNode: Node | null | undefined;
    if (assertNodeTagName(root.firstChild, 'div')) {
      valueNode = root.firstChild.firstChild;
    }

    equalTokens(root, '<div><div data-modifier="installed - Super Metroid"></div></div>', "initial render");
    assert.equal(manager.installedElements.length, 1);
    assert.equal(valueNode, manager.installedElements[0]);
    assert.equal(manager.updatedElements.length, 0);
    assert.equal(manager.destroyedModifiers.length, 0);

    rerender();

    equalTokens(root, '<div><div data-modifier="updated - Super Metroid"></div></div>', "modifier updated");
    assert.equal(manager.installedElements.length, 1);
    assert.equal(valueNode, manager.installedElements[0]);
    assert.equal(manager.updatedElements.length, 1);
    assert.equal(valueNode, manager.updatedElements[0]);
    assert.equal(manager.destroyedModifiers.length, 0);

    input.bar = 'Super Mario';

    rerender();

    equalTokens(root, '<div><div data-modifier="updated - Super Mario"></div></div>', "no change");
    assert.equal(manager.installedElements.length, 1);
    assert.equal(valueNode, manager.installedElements[0]);
    assert.equal(manager.updatedElements.length, 2);
    assert.equal(valueNode, manager.updatedElements[1]);
    assert.equal(manager.destroyedModifiers.length, 0);
  });

  test("Const input doesn't trigger update in a element modifier", assert => {
    let manager = new TestModifierManager();
    env.registerModifier('foo', manager);

    let template = compile('<div><div {{foo "bar"}}></div></div>');
    let input = {};

    render(template, input);

    let valueNode: Node | null | undefined;
    if (assertNodeTagName(root.firstChild, 'div')) {
      valueNode = root.firstChild.firstChild;
    }

    equalTokens(root, '<div><div data-modifier="installed - bar"></div></div>', "initial render");
    assert.equal(manager.installedElements.length, 1);
    assert.equal(valueNode, manager.installedElements[0]);
    assert.equal(manager.updatedElements.length, 0);
    assert.equal(manager.destroyedModifiers.length, 0);

    rerender();

    equalTokens(root, '<div><div data-modifier="installed - bar"></div></div>', "no change");
    assert.equal(manager.installedElements.length, 1);
    assert.equal(valueNode, manager.installedElements[0]);
    assert.equal(manager.updatedElements.length, 0);
    assert.equal(manager.destroyedModifiers.length, 0);
  });

  test("Destructor is triggered on element modifiers", assert => {
    let manager = new TestModifierManager();
    env.registerModifier('foo', manager);

    let template = compile('{{#if bar}}<div {{foo bar}}></div>{{else}}<div></div>{{/if}}');
    let input = {
      bar: true
    };

    render(template, input);

    let valueNode = root.firstChild;

    equalTokens(root, '<div data-modifier="installed - true"></div>', "initial render");
    assert.equal(manager.installedElements.length, 1);
    assert.equal(valueNode, manager.installedElements[0]);
    assert.equal(manager.updatedElements.length, 0);
    assert.equal(manager.destroyedModifiers.length, 0);

    rerender();

    equalTokens(root, '<div data-modifier="updated - true"></div>', "modifier updated");
    assert.equal(manager.installedElements.length, 1);
    assert.equal(valueNode, manager.installedElements[0]);
    assert.equal(manager.updatedElements.length, 1);
    assert.equal(manager.destroyedModifiers.length, 0);

    input.bar = false;
    rerender();

    equalTokens(root, '<div></div>', "no more modifier");
    assert.equal(manager.destroyedModifiers.length, 1);

    input.bar = true;
    rerender();

    equalTokens(root, '<div data-modifier="installed - true"></div>', "back to default render");
    assert.equal(manager.installedElements.length, 2);
    assert.equal(manager.destroyedModifiers.length, 1);
  });

});
