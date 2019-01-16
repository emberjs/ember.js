import {
  AnnotatedModuleLocator,
  Option,
  RenderResult,
  RichIteratorResult,
  Template,
  TemplateMeta,
} from '@glimmer/interfaces';
import { UpdatableReference } from '@glimmer/object-reference';
import { bump, ConstReference } from '@glimmer/reference';
import {
  clientBuilder,
  PrimitiveReference,
  SafeString,
  UNDEFINED_REFERENCE,
  renderJitMain,
} from '@glimmer/runtime';
import {
  assertNodeTagName,
  BasicComponent,
  equalTokens,
  getElementByClassName,
  getElementsByTagName,
  stripTight,
  toTextContent,
  trimLines,
  registerInternalHelper,
  registerPartial,
  registerHelper,
  preprocess,
  registerModifier,
  registerBasicComponent,
  JitTestContext,
  TestContext,
} from '@glimmer/test-helpers';
import { Namespace, SimpleElement, SimpleNode } from '@simple-dom/interface';
import { assert, module, test } from './support';

const SVG_NAMESPACE = Namespace.SVG;
const XLINK_NAMESPACE = Namespace.XLink;
const XHTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';

let self: UpdatableReference<any>;
let result: RenderResult;

let context: TestContext;

function compile(template: string) {
  return preprocess(template);
}

function commonSetup() {
  context = JitTestContext();
}

function assertProperty<T, K extends keyof T, V extends T[K]>(
  obj: T | null,
  key: K,
  value: V
): void {
  QUnit.assert.notStrictEqual(obj, null);
  if (obj !== null) {
    QUnit.assert.equal(obj[key], value);
  }
}

function render(template: Template<TemplateMeta<AnnotatedModuleLocator>>, state = {}) {
  self = new UpdatableReference(state);
  context.env.begin();
  let cursor = { element: context.root, nextSibling: null };

  let templateIterator = renderJitMain(
    context.runtime,
    context.syntax,
    self,
    clientBuilder(context.env, cursor),
    template.asLayout().compile(context.syntax)
  );

  let iteratorResult: RichIteratorResult<null, RenderResult>;
  do {
    iteratorResult = templateIterator.next();
  } while (!iteratorResult.done);

  result = iteratorResult.value;
  context.env.commit();
  assertInvariants(QUnit.assert, result);
  return result;
}

function rerender(state: any = null) {
  if (state !== null) self.update(state);
  bump();
  context.env.begin();
  result.rerender();
  context.env.commit();
}

function getNodeByClassName(className: string) {
  let itemNode = getElementByClassName(context.root, className);
  // let itemNode = context.root.querySelector(`.${className}`);
  assert.ok(itemNode, "Expected node with class='" + className + "'");
  return itemNode;
}

function getFirstChildOfNode(className: string) {
  let itemNode = getNodeByClassName(className);
  assert.ok(
    itemNode,
    "Expected child node of node with class='" + className + "', but no parent node found"
  );

  let childNode = itemNode && itemNode.firstChild;
  assert.ok(
    childNode,
    "Expected child node of node with class='" + className + "', but not child node found"
  );

  return childNode;
}

function assertInvariants(assert: Assert, result: RenderResult, msg?: string) {
  assert.strictEqual(
    result.firstNode(),
    context.root.firstChild,
    `The firstNode of the result is the same as the context.root's firstChild${
      msg ? ': ' + msg : ''
    }`
  );
  assert.strictEqual(
    result.lastNode(),
    context.root.lastChild,
    `The lastNode of the result is the same as the context.root's lastChild${msg ? ': ' + msg : ''}`
  );
}

module('[jit] Updating', hooks => {
  hooks.beforeEach(() => commonSetup());

  test('updating a single curly', assert => {
    let object = { value: 'hello world' };
    let template = compile('<div><p>{{value}}</p></div>');
    render(template, object);
    let valueNode: Node | null | undefined;
    if (assertNodeTagName(context.root.firstChild, 'div')) {
      if (assertNodeTagName(context.root.firstChild.firstChild, 'p')) {
        valueNode = context.root.firstChild.firstChild.firstChild;
      }
    }

    equalTokens(context.root, '<div><p>hello world</p></div>', 'Initial render');

    rerender();

    equalTokens(context.root, '<div><p>hello world</p></div>', 'no change');

    if (assertNodeTagName(context.root.firstChild, 'div')) {
      if (assertNodeTagName(context.root.firstChild.firstChild, 'p')) {
        assert.strictEqual(
          context.root.firstChild.firstChild.firstChild,
          valueNode,
          'The text node was not blown away'
        );
      }
    }

    object.value = 'goodbye world';
    rerender();

    equalTokens(context.root, '<div><p>goodbye world</p></div>', 'After updating and dirtying');
    if (assertNodeTagName(context.root.firstChild, 'div')) {
      if (assertNodeTagName(context.root.firstChild.firstChild, 'p')) {
        assert.strictEqual(
          context.root.firstChild.firstChild.firstChild,
          valueNode,
          'The text node was not blown away'
        );
      }
    }
  });

  test('updating a single curly with siblings', () => {
    let value = 'brave new ';
    let state = { value };
    let template = compile('<div>hello {{value}}world</div>');
    render(template, state);

    function assertText(text1: string, text2: string, text3: string) {
      if (assertNodeTagName(context.root.firstChild, 'div')) {
        assertProperty(context.root.firstChild.firstChild, 'textContent', text1);
        assertProperty(context.root.firstChild.childNodes[1], 'textContent', text2);
        assertProperty(context.root.firstChild.lastChild, 'textContent', text3);
      }
    }

    assertText('hello ', 'brave new ', 'world');

    rerender();

    assertText('hello ', 'brave new ', 'world');

    state.value = 'another ';
    rerender();

    assertText('hello ', 'another ', 'world');

    rerender({ value });

    assertText('hello ', 'brave new ', 'world');
  });

  test('null and undefined produces empty text nodes', assert => {
    let object = { v1: null as string | null, v2: undefined as string | undefined };
    let template = compile('<div><p>{{v1}}</p><p>{{v2}}</p></div>');
    render(template, object);

    let valueNode1: Node | null;
    let valueNode2: Node | null;
    if (
      assertNodeTagName(context.root.firstChild, 'div') &&
      assertNodeTagName(context.root.firstChild.firstChild, 'p') &&
      assertNodeTagName(context.root.firstChild.lastChild, 'p')
    ) {
      valueNode1 = context.root.firstChild.firstChild.firstChild;
      valueNode2 = context.root.firstChild.lastChild.firstChild;
    }

    function assertStable() {
      if (
        assertNodeTagName(context.root.firstChild, 'div') &&
        assertNodeTagName(context.root.firstChild.firstChild, 'p') &&
        assertNodeTagName(context.root.firstChild.lastChild, 'p')
      ) {
        assert.equal(
          context.root.firstChild.firstChild.firstChild,
          valueNode1,
          'The text node was not blown away'
        );
        assert.equal(
          context.root.firstChild.lastChild.firstChild,
          valueNode2,
          'The text node was not blown away'
        );
      }
    }

    equalTokens(context.root, '<div><p></p><p></p></div>', 'Initial render');

    rerender();

    equalTokens(context.root, '<div><p></p><p></p></div>', 'no change');

    assertStable();

    object.v1 = 'hello';

    rerender();

    equalTokens(context.root, '<div><p>hello</p><p></p></div>', 'After updating and dirtying');

    assertStable();

    object.v2 = 'world';
    rerender();

    equalTokens(context.root, '<div><p>hello</p><p>world</p></div>', 'After updating and dirtying');

    assertStable();

    object.v1 = null;
    object.v2 = undefined;
    rerender();

    equalTokens(context.root, '<div><p></p><p></p></div>', 'Reset');

    assertStable();
  });

  test('weird paths', () => {
    let state = {
      '': 'empty string',
      '1': '1',
      undefined: 'undefined',
      null: 'null',
      true: 'true',
      false: 'false',
      this: 'this',
      'foo.bar': 'foo.bar',
      nested: null as any | null,
    };

    state.nested = state;

    function assertTextContent(expected: string) {
      if (assertNodeTagName(context.root.firstChild, 'div')) {
        assertProperty(context.root.firstChild, 'textContent', expected);
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
    render(template, state);

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

    state[''] = 'EMPTY STRING';
    state['1'] = 'ONE';
    state['undefined'] = 'UNDEFINED';
    state['null'] = 'NULL';
    state['true'] = 'TRUE';
    state['false'] = 'FALSE';
    state['this'] = 'THIS';
    state['foo.bar'] = 'FOO.BAR';
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

    state = {
      '': 'empty string',
      '1': '1',
      undefined: 'undefined',
      null: 'null',
      true: 'true',
      false: 'false',
      this: 'this',
      'foo.bar': 'foo.bar',
      nested: null,
    };
    state.nested = state;

    rerender(state);

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

  test('updating a single trusting curly', assert => {
    let value = '<p>hello world</p>';
    let object = { value };
    let template = compile('<div>{{{value}}}</div>');
    render(template, object);
    let valueNode: Node | null | undefined;
    if (
      assertNodeTagName(context.root.firstChild, 'div') &&
      assertNodeTagName(context.root.firstChild.firstChild, 'p')
    ) {
      valueNode = context.root.firstChild.firstChild.firstChild;
    }

    equalTokens(context.root, `<div>${value}</div>`, 'Initial render');

    rerender();

    equalTokens(context.root, '<div><p>hello world</p></div>', 'no change');
    if (
      assertNodeTagName(context.root.firstChild, 'div') &&
      assertNodeTagName(context.root.firstChild.firstChild, 'p')
    ) {
      assert.strictEqual(
        context.root.firstChild.firstChild.firstChild,
        valueNode,
        'The text node was not blown away'
      );
    }

    object.value = '<span>goodbye world</span>';
    rerender();

    equalTokens(context.root, `<div>${object.value}</div>`, 'After updating and dirtying');
    if (
      assertNodeTagName(context.root.firstChild, 'div') &&
      assertNodeTagName(context.root.firstChild.firstChild, 'span')
    ) {
      assert.notStrictEqual(
        context.root.firstChild.firstChild.firstChild,
        valueNode,
        'The text node was blown away'
      );
    }

    object.value = 'a <span>good man</span> is hard to <b>fund</b>';
    rerender();

    equalTokens(
      context.root,
      `<div>${object.value}</div>`,
      'After updating with many nodes and dirtying'
    );

    rerender({ value });

    equalTokens(context.root, `<div>${value}</div>`, 'no change');
  });

  test('updating a single trusting curly with siblings', () => {
    let value = '<b>brave new </b>';
    let state = { value };
    let template = compile('<div>hello {{{value}}}world</div>');
    render(template, state);

    equalTokens(context.root, '<div>hello <b>brave new </b>world</div>', 'Initial render');

    rerender();

    equalTokens(context.root, '<div>hello <b>brave new </b>world</div>', 'rerender');

    state.value = 'big <b>wide</b> ';
    rerender();

    if (assertNodeTagName(context.root.firstChild, 'div')) {
      assertProperty(context.root.firstChild.firstChild, 'textContent', 'hello ');
      assertProperty(context.root.firstChild.childNodes[1], 'textContent', 'big ');
      assertProperty(context.root.firstChild.childNodes[2], 'textContent', 'wide');
      assertProperty(context.root.firstChild.childNodes[3], 'textContent', ' ');
      assertProperty(context.root.firstChild.lastChild, 'textContent', 'world');
    }

    state.value = 'another ';
    rerender();

    if (assertNodeTagName(context.root.firstChild, 'div')) {
      assertProperty(context.root.firstChild.firstChild, 'textContent', 'hello ');
      assertProperty(context.root.firstChild.childNodes[1], 'textContent', 'another ');
      assertProperty(context.root.firstChild.lastChild, 'textContent', 'world');
    }

    rerender({ value });

    equalTokens(context.root, '<div>hello <b>brave new </b>world</div>', 'rerender');
  });

  test('updating a single trusting curly with previous sibling', () => {
    let value = '<b>brave new </b>';
    let state = { value };
    let template = compile('<div>hello {{{value}}}</div>');
    render(template, state);

    equalTokens(context.root, '<div>hello <b>brave new </b></div>', 'Initial render');

    rerender();

    equalTokens(context.root, '<div>hello <b>brave new </b></div>', 'rerender');

    state.value = 'another ';
    rerender();

    if (assertNodeTagName(context.root.firstChild, 'div')) {
      assertProperty(context.root.firstChild.firstChild, 'textContent', 'hello ');
      assertProperty(context.root.firstChild.lastChild, 'textContent', 'another ');
    }

    rerender({ value });

    equalTokens(context.root, '<div>hello <b>brave new </b></div>', 'rerender');
  });

  // This is to catch a regression about not caching lastValue correctly
  test('Cycling between two values in a trusting curly', () => {
    let a = '<p>A</p>';
    let b = '<p>B</p>';

    let object = { value: a };
    let template = compile('<div>{{{value}}}</div>');
    render(template, object);

    equalTokens(context.root, '<div><p>A</p></div>', 'Initial render');

    object.value = b;
    rerender();
    equalTokens(context.root, '<div><p>B</p></div>', 'Updating');

    // Change it back
    object.value = a;
    rerender();
    equalTokens(context.root, '<div><p>A</p></div>', 'Updating');

    // Change it back
    object.value = b;
    rerender();
    equalTokens(context.root, '<div><p>B</p></div>', 'Updating');
  });

  test('updating a curly with a safe and unsafe string', assert => {
    interface SafeString {
      string: string;
      toHTML(): string;
      toString(): string;
    }

    let safeString = {
      string: '<p>hello world</p>',
      toHTML: function(this: SafeString) {
        return this.string;
      },
      toString: function(this: SafeString) {
        return this.string;
      },
    };
    let unsafeString = '<b>Big old world!</b>';
    let object: { value: SafeString | string } = {
      value: safeString,
    };
    let template = compile('<div>{{value}}</div>');
    render(template, object);
    let valueNode: Node | null | undefined;
    if (
      assertNodeTagName(context.root.firstChild, 'div') &&
      assertNodeTagName(context.root.firstChild.firstChild, 'p')
    ) {
      valueNode = context.root.firstChild.firstChild.firstChild;
    }

    equalTokens(context.root, '<div><p>hello world</p></div>', 'Initial render');

    rerender();

    equalTokens(context.root, '<div><p>hello world</p></div>', 'no change');

    if (
      assertNodeTagName(context.root.firstChild, 'div') &&
      assertNodeTagName(context.root.firstChild.firstChild, 'p')
    ) {
      assert.strictEqual(
        context.root.firstChild.firstChild.firstChild,
        valueNode,
        'The text node was not blown away'
      );
    }

    object.value = unsafeString;
    rerender();

    equalTokens(
      context.root,
      '<div>&lt;b&gt;Big old world!&lt;/b&gt;</div>',
      'After replacing with unsafe string'
    );

    if (assertNodeTagName(context.root.firstChild, 'div')) {
      assert.notStrictEqual(
        context.root.firstChild.firstChild,
        valueNode,
        'The text node was blown away'
      );
    }

    object.value = safeString;
    rerender();

    equalTokens(context.root, '<div><p>hello world</p></div>', 'original input causes no problem');
  });

  function makeSafeString(value: string): SafeString {
    return new SafeStringImpl(value);
  }

  class SafeStringImpl implements SafeString {
    constructor(private string: string) {}
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

  function makeElement(tag: string, content: string): SimpleElement {
    let el = context.doc.createElement(tag);
    el.appendChild(context.doc.createTextNode(content));
    return el;
  }

  function makeSVGElement(tag: string, content: string): SimpleElement {
    let el = context.doc.createElementNS(SVG_NAMESPACE, tag);
    el.appendChild(context.doc.createTextNode(content));
    return el;
  }

  function makeFragment(nodes: SimpleNode[]) {
    let frag = context.doc.createDocumentFragment();
    nodes.forEach(node => frag.appendChild(node));
    return frag;
  }

  type ContentValue =
    | string
    | SafeString
    | null
    | undefined
    | number
    | boolean
    | Element
    | DocumentFragment;

  interface ContentTestCase {
    name: string;
    template: string;
    values: Array<{
      input: ContentValue | ((isHTML: boolean) => ContentValue) | { toString(): string };
      expected: string | ((isHTML: boolean) => string);
      description: string;
    }>;
  }

  function isInputFunction(value: any): value is (isHTML: boolean) => unknown {
    return typeof value === 'function';
  }

  function generateContentTestCase(tc: ContentTestCase): void {
    [
      {
        name: 'HTML context, as the only child',
        isHTML: true,
        before: '<div>',
        after: '</div>',
      },
      {
        name: 'HTML context, as a sibling to adjecent text nodes',
        isHTML: true,
        before: '<div>before',
        after: 'after</div>',
      },
      {
        name: 'HTML context, as a sibling to adjecent elements',
        isHTML: true,
        before: '<div><b>before</b>',
        after: '<b>after</b></div>',
      },
      {
        name: 'SVG foreignObject context, as the only child',
        isHTML: true,
        before: '<svg><foreignObject>',
        after: '</foreignObject></svg>',
      },
      {
        name: 'SVG foreignObject context, as a sibling to adjecent text nodes',
        isHTML: true,
        before: '<svg><foreignObject>before',
        after: 'after</foreignObject></svg>',
      },
      {
        name: 'SVG foreignObject context, as a sibling to adjecent elements',
        isHTML: true,
        before: '<svg><foreignObject><b>before</b>',
        after: '<b>after</b></foreignObject></svg>',
      },
      {
        name: 'SVG context, as the only child',
        isHTML: false,
        before: '<svg><text>',
        after: '</text></svg>',
      },
      {
        name: 'SVG context, as a sibling to adjecent text nodes',
        isHTML: false,
        before: '<svg><text>before',
        after: 'after</text></svg>',
      },
      {
        name: 'SVG context, as a sibling to adjecent elements',
        isHTML: false,
        before: '<svg><text><text>before</text>',
        after: '<text>after</text></text></svg>',
      },
    ].forEach(wrapper => {
      test(`updating ${tc.name} produces expected result in ${wrapper.name}`, () => {
        let template = compile(wrapper.before + tc.template + wrapper.after);
        let state = {
          value: undefined as unknown,
        };
        tc.values.forEach(({ input: _input, expected: _expected, description }, index) => {
          let input: unknown;
          let expected: string;

          if (isInputFunction(_input)) {
            input = _input(wrapper.isHTML);
          } else {
            input = _input;
          }

          if (typeof _expected === 'function') {
            expected = _expected(wrapper.isHTML);
          } else {
            expected = _expected;
          }

          state.value = input;

          if (index === 0) {
            render(template, state);
            equalTokens(
              context.root,
              wrapper.before + expected + wrapper.after,
              `expected initial render (${description})`
            );
          } else {
            rerender();
            equalTokens(
              context.root,
              wrapper.before + expected + wrapper.after,
              `expected updated render (${description})`
            );
          }
        });
      });
    });
  }

  generateContentTestCase({
    name: 'double curlies',
    template: '{{value}}',
    values: [
      {
        input: 'hello',
        expected: 'hello',
        description: 'plain string',
      },
      {
        input: '<b>hello</b>',
        expected: '&lt;b&gt;hello&lt;/b&gt;',
        description: 'string containing HTML',
      },
      {
        input: null,
        expected: '',
        description: 'null literal',
      },
      {
        input: undefined,
        expected: '',
        description: 'undefined literal',
      },
      {
        input: '',
        expected: '',
        description: 'empty string',
      },
      {
        input: ' ',
        expected: ' ',
        description: 'blank string',
      },
      {
        input: isHTML => makeSafeString(isHTML ? '<b>hello</b>' : '<text>hello</text>'),
        expected: isHTML => (isHTML ? '<b>hello</b>' : '<text>hello</text>'),
        description: 'safe string containing HTML',
      },
      {
        input: makeSafeString(''),
        expected: '<!---->',
        description: 'empty safe string',
      },
      {
        input: makeSafeString(' '),
        expected: ' ',
        description: 'blank safe string',
      },
      {
        input: isHTML => (isHTML ? makeElement('p', 'hello') : makeSVGElement('text', 'hello')),
        expected: isHTML => (isHTML ? '<p>hello</p>' : '<text>hello</text>'),
        description: 'DOM node containing an element with text',
      },
      {
        input: isHTML => {
          if (isHTML) {
            return makeFragment([makeElement('p', 'one'), makeElement('p', 'two')]);
          } else {
            return makeFragment([makeSVGElement('text', 'one'), makeSVGElement('text', 'two')]);
          }
        },
        expected: isHTML => (isHTML ? '<p>one</p><p>two</p>' : '<text>one</text><text>two</text>'),
        description: 'DOM fragment containing multiple nodes',
      },
      {
        input: 'not modified',
        expected: 'not modified',
        description: 'plain string (not modified, first render)',
      },
      {
        input: 'not modified',
        expected: 'not modified',
        description: 'plain string (not modified, second render)',
      },
      {
        input: 0,
        expected: '0',
        description: 'number literal (0)',
      },
      {
        input: true,
        expected: 'true',
        description: 'boolean literal (true)',
      },
      {
        input: {
          toString() {
            return 'I am an Object';
          },
        },
        expected: 'I am an Object',
        description: 'object with a toString function',
      },
      {
        input: 'hello',
        expected: 'hello',
        description: 'reset',
      },
    ],
  });

  generateContentTestCase({
    name: 'triple curlies',
    template: '{{{value}}}',
    values: [
      {
        input: 'hello',
        expected: 'hello',
        description: 'plain string',
      },
      {
        input: isHTML => (isHTML ? '<b>hello</b>' : '<text>hello</text>'),
        expected: isHTML => (isHTML ? '<b>hello</b>' : '<text>hello</text>'),
        description: 'string containing HTML',
      },
      {
        input: null,
        expected: '<!--->',
        description: 'null literal',
      },
      {
        input: undefined,
        expected: '<!--->',
        description: 'undefined literal',
      },
      {
        input: '',
        expected: '<!--->',
        description: 'empty string',
      },
      {
        input: ' ',
        expected: ' ',
        description: 'blank string',
      },
      {
        input: isHTML => makeSafeString(isHTML ? '<b>hello</b>' : '<text>hello</text>'),
        expected: isHTML => (isHTML ? '<b>hello</b>' : '<text>hello</text>'),
        description: 'safe string containing HTML',
      },
      {
        input: makeSafeString(''),
        expected: '<!---->',
        description: 'empty safe string',
      },
      {
        input: makeSafeString(' '),
        expected: ' ',
        description: 'blank safe string',
      },
      {
        input: isHTML => (isHTML ? makeElement('p', 'hello') : makeSVGElement('text', 'hello')),
        expected: isHTML => (isHTML ? '<p>hello</p>' : '<text>hello</text>'),
        description: 'DOM node containing an element with text',
      },
      {
        input: isHTML => {
          if (isHTML) {
            return makeFragment([makeElement('p', 'one'), makeElement('p', 'two')]);
          } else {
            return makeFragment([makeSVGElement('text', 'one'), makeSVGElement('text', 'two')]);
          }
        },
        expected: isHTML => (isHTML ? '<p>one</p><p>two</p>' : '<text>one</text><text>two</text>'),
        description: 'DOM fragment containing multiple nodes',
      },
      {
        input: 'not modified',
        expected: 'not modified',
        description: 'plain string (not modified, first render)',
      },
      {
        input: 'not modified',
        expected: 'not modified',
        description: 'plain string (not modified, second render)',
      },
      {
        input: 0,
        expected: '0',
        description: 'number literal (0)',
      },
      {
        input: true,
        expected: 'true',
        description: 'boolean literal (true)',
      },
      {
        input: {
          toString() {
            return 'I am an Object';
          },
        },
        expected: 'I am an Object',
        description: 'object with a toString function',
      },
      {
        input: 'hello',
        expected: 'hello',
        description: 'reset',
      },
    ],
  });

  test('updating a triple curly with a safe and unsafe string', assert => {
    let safeString = makeSafeString('<p>hello world</p>');
    let unsafeString = '<b>Big old world!</b>';
    let object: { value: string | SafeString } = {
      value: safeString,
    };
    let template = compile('<div>{{{value}}}</div>');
    render(template, object);

    let valueNode: Node | null | undefined;
    if (
      assertNodeTagName(context.root.firstChild, 'div') &&
      assertNodeTagName(context.root.firstChild.firstChild, 'p')
    ) {
      valueNode = context.root.firstChild.firstChild.firstChild;
    }

    equalTokens(context.root, '<div><p>hello world</p></div>', 'Initial render');

    rerender();

    equalTokens(context.root, '<div><p>hello world</p></div>', 'no change');
    if (
      assertNodeTagName(context.root.firstChild, 'div') &&
      assertNodeTagName(context.root.firstChild.firstChild, 'p')
    ) {
      assert.strictEqual(
        context.root.firstChild.firstChild.firstChild,
        valueNode,
        'The nodes were not blown away'
      );
    }

    object.value = unsafeString;
    rerender();

    equalTokens(
      context.root,
      '<div><b>Big old world!</b></div>',
      'Normal strings may contain HTML'
    );
    if (
      assertNodeTagName(context.root.firstChild, 'div') &&
      assertNodeTagName(context.root.firstChild.firstChild, 'b')
    ) {
      assert.notStrictEqual(
        context.root.firstChild.firstChild.firstChild,
        valueNode,
        'The nodes were blown away'
      );
    }

    object.value = safeString;
    rerender();

    equalTokens(context.root, '<div><p>hello world</p></div>', 'original input causes no problem');
  });

  test('triple curlies with empty string initial value', () => {
    let input = {
      value: '',
    };
    let template = compile('<div>{{{value}}}</div>');

    render(template, input);

    equalTokens(context.root, '<div><!----></div>', 'Initial render');

    rerender();

    equalTokens(context.root, '<div><!----></div>', 'no change');

    input.value = '<b>Bold and spicy</b>';
    rerender();

    equalTokens(context.root, '<div><b>Bold and spicy</b></div>', 'markup is updated');

    input.value = '';
    rerender();

    equalTokens(context.root, '<div><!----></div>', 'back to empty string');
  });

  class ValueReference<T> extends ConstReference<T> {
    get(): PrimitiveReference<undefined> {
      return UNDEFINED_REFERENCE;
    }
  }

  test('double curlies with const SafeString', assert => {
    let rawString = '<b>bold</b> and spicy';

    registerInternalHelper(context.registry, 'const-foobar', () => {
      return new ValueReference<unknown>(makeSafeString(rawString));
    });

    let template = compile('<div>{{const-foobar}}</div>');
    let input = {};

    render(template, input);
    let valueNode: Node | null | undefined;
    if (assertNodeTagName(context.root.firstChild, 'div')) {
      valueNode = context.root.firstChild.firstChild;
    }

    equalTokens(context.root, '<div><b>bold</b> and spicy</div>', 'initial render');

    rerender();

    equalTokens(context.root, '<div><b>bold</b> and spicy</div>', 'no change');
    if (assertNodeTagName(context.root.firstChild, 'div')) {
      assert.strictEqual(
        context.root.firstChild.firstChild,
        valueNode,
        'The nodes were not blown away'
      );
    }
  });

  test('double curlies with const Node', assert => {
    let rawString = '<b>bold</b> and spicy';

    registerInternalHelper(context.registry, 'const-foobar', () => {
      return new ValueReference<unknown>(context.doc.createTextNode(rawString));
    });

    let template = compile('<div>{{const-foobar}}</div>');
    let input = {};

    render(template, input);
    let valueNode: Node | null | undefined;
    if (assertNodeTagName(context.root.firstChild, 'div')) {
      valueNode = context.root.firstChild.firstChild;
    }

    equalTokens(context.root, '<div>&lt;b&gt;bold&lt;/b&gt; and spicy</div>', 'initial render');

    rerender();

    equalTokens(context.root, '<div>&lt;b&gt;bold&lt;/b&gt; and spicy</div>', 'no change');
    if (assertNodeTagName(context.root.firstChild, 'div')) {
      assert.strictEqual(
        context.root.firstChild.firstChild,
        valueNode,
        'The node was not blown away'
      );
    }
  });

  test('triple curlies with const SafeString', assert => {
    let rawString = '<b>bold</b> and spicy';

    registerInternalHelper(context.registry, 'const-foobar', () => {
      return new ValueReference<unknown>(makeSafeString(rawString));
    });

    let template = compile('<div>{{{const-foobar}}}</div>');
    let input = {};

    render(template, input);
    let valueNode: Node | null | undefined;
    if (assertNodeTagName(context.root.firstChild, 'div')) {
      valueNode = context.root.firstChild.firstChild;
    }

    equalTokens(context.root, '<div><b>bold</b> and spicy</div>', 'initial render');

    rerender();

    equalTokens(context.root, '<div><b>bold</b> and spicy</div>', 'no change');

    if (assertNodeTagName(context.root.firstChild, 'div')) {
      assert.strictEqual(
        context.root.firstChild.firstChild,
        valueNode,
        'The nodes were not blown away'
      );
    }
  });

  test('triple curlies with const Node', assert => {
    let rawString = '<b>bold</b> and spicy';

    registerInternalHelper(context.registry, 'const-foobar', () => {
      return new ValueReference<unknown>(context.doc.createTextNode(rawString));
    });

    let template = compile('<div>{{{const-foobar}}}</div>');
    let input = {};

    render(template, input);
    let valueNode = context.root.firstChild;

    equalTokens(context.root, '<div>&lt;b&gt;bold&lt;/b&gt; and spicy</div>', 'initial render');

    rerender();

    equalTokens(context.root, '<div>&lt;b&gt;bold&lt;/b&gt; and spicy</div>', 'no change');
    assert.strictEqual(context.root.firstChild, valueNode, 'The node was not blown away');
  });

  test('helpers can add destroyables', assert => {
    let destroyable = {
      count: 0,
      destroy(this: { count: number }) {
        this.count++;
      },
    };

    registerInternalHelper(context.registry, 'destroy-me', (_args, vm) => {
      vm.associateDestroyable(destroyable);
      return PrimitiveReference.create('destroy me!');
    });

    let template = compile('<div>{{destroy-me}}</div>');

    render(template, {});

    equalTokens(context.root, '<div>destroy me!</div>', 'initial render');
    assert.strictEqual(destroyable.count, 0, 'not destroyed');

    rerender();

    equalTokens(context.root, '<div>destroy me!</div>', 'no change');
    assert.strictEqual(destroyable.count, 0, 'not destroyed');

    result.destroy();

    assert.strictEqual(destroyable.count, 1, 'is destroyed');
  });

  test(`helpers passed as arguments to {{#if}} are not torn down when switching between blocks`, assert => {
    let options = {
      template: '{{#if (stateful-foo)}}Yes{{/if}}',
      truthyValue: true,
      falsyValue: false,
    };

    testStatefulHelper(assert, options);
  });

  test(`helpers passed as arguments to {{#unless}} are not torn down when switching between blocks`, assert => {
    let options = {
      template: '{{#unless (stateful-foo)}}Yes{{/unless}}',
      truthyValue: false,
      falsyValue: true,
    };

    testStatefulHelper(assert, options);
  });

  test(`helpers passed as arguments to {{#with}} are not torn down when switching between blocks`, assert => {
    let options = {
      template: '{{#with (stateful-foo) as |unused|}}Yes{{/with}}',
      truthyValue: {},
      falsyValue: null,
    };

    testStatefulHelper(assert, options);
  });

  test(`helpers passed as arguments to {{#each}} are not torn down when switching between blocks`, assert => {
    let options = {
      template: '{{#each (stateful-foo) key="@index" as |unused|}}Yes{{/each}}',
      truthyValue: [1],
      falsyValue: null,
    };

    testStatefulHelper(assert, options);
  });

  test(`helpers passed as arguments to {{partial}} are not torn down when switching between blocks`, assert => {
    registerPartial(context.registry, 'yasss', 'Yes');
    registerPartial(context.registry, 'noooo', '');

    let options = {
      template: '{{partial (stateful-foo)}}',
      truthyValue: 'yasss',
      falsyValue: 'noooo',
    };

    testStatefulHelper(assert, options);
  });

  test(`helpers passed as arguments to {{component}} are not torn down when switching between blocks`, assert => {
    registerBasicComponent(context.registry, 'XYasss', BasicComponent, '<div>Yes</div>');

    let options = {
      template: '{{component (stateful-foo)}}',
      truthyValue: 'XYasss',
      falsyValue: null,
    };

    testStatefulHelper(assert, options);
  });

  test(`helpers passed as arguments to {{#in-element}} are not torn down when switching between blocks`, assert => {
    let externalElement = context.doc.createElement('div');

    let options = {
      template: '{{#in-element (stateful-foo)}}Yes{{/in-element}}',
      truthyValue: externalElement,
      falsyValue: null,
      element: externalElement,
    };

    testStatefulHelper(assert, options);
  });

  function testStatefulHelper<T, U>(
    assert: typeof QUnit.assert,
    arg1: {
      template: string;
      truthyValue: T;
      falsyValue: U;
      element?: SimpleElement;
    }
  ) {
    let { template, truthyValue, falsyValue, element = context.root } = arg1;
    let didCreate = 0;
    let didDestroy = 0;
    let reference: UpdatableReference<T | U> | undefined;

    registerInternalHelper(context.registry, 'stateful-foo', (_args, vm) => {
      didCreate++;

      vm.associateDestroyable({
        destroy() {
          didDestroy++;
        },
      });

      return (reference = new UpdatableReference(truthyValue));
    });

    assert.strictEqual(didCreate, 0, 'didCreate: before render');
    assert.strictEqual(didDestroy, 0, 'didDestroy: before render');

    render(compile(template), {});

    assert.equal(toTextContent(element), 'Yes', 'initial render');
    assert.strictEqual(didCreate, 1, 'didCreate: after initial render');
    assert.strictEqual(didDestroy, 0, 'didDestroy: after initial render');

    rerender();

    assert.equal(toTextContent(element), 'Yes', 'after no-op re-render');
    assert.strictEqual(didCreate, 1, 'didCreate: after no-op re-render');
    assert.strictEqual(didDestroy, 0, 'didDestroy: after no-op re-render');

    reference!.update(falsyValue);
    rerender();

    assert.strictEqual(toTextContent(element), '', 'after switching to falsy');
    assert.strictEqual(didCreate, 1, 'didCreate: after switching to falsy');
    assert.strictEqual(didDestroy, 0, 'didDestroy: after switching to falsy');

    reference!.update(truthyValue);
    rerender();

    assert.equal(toTextContent(element), 'Yes', 'after reset');
    assert.strictEqual(didCreate, 1, 'didCreate: after reset');
    assert.strictEqual(didDestroy, 0, 'didDestroy: after reset');
  }

  test('updating a curly with this', assert => {
    let object = { value: 'hello world' };
    let template = compile('<div><p>{{this.value}}</p></div>');
    render(template, object);

    let valueNode: Node | null | undefined;
    if (
      assertNodeTagName(context.root.firstChild, 'div') &&
      assertNodeTagName(context.root.firstChild.firstChild, 'p')
    ) {
      valueNode = context.root.firstChild.firstChild.firstChild;
    }

    equalTokens(context.root, '<div><p>hello world</p></div>', 'Initial render');

    rerender();

    equalTokens(context.root, '<div><p>hello world</p></div>', 'no change');
    if (
      assertNodeTagName(context.root.firstChild, 'div') &&
      assertNodeTagName(context.root.firstChild.firstChild, 'p')
    ) {
      assert.strictEqual(
        context.root.firstChild.firstChild.firstChild,
        valueNode,
        'The text node was not blown away'
      );
    }

    object.value = 'goodbye world';
    rerender();

    equalTokens(context.root, '<div><p>goodbye world</p></div>', 'After updating and dirtying');
    if (
      assertNodeTagName(context.root.firstChild, 'div') &&
      assertNodeTagName(context.root.firstChild.firstChild, 'p')
    ) {
      assert.strictEqual(
        context.root.firstChild.firstChild.firstChild,
        valueNode,
        'The text node was not blown away'
      );
    }
  });

  test('a simple implementation of a dirtying rerender', assert => {
    let object = { condition: true, value: 'hello world' };
    let template = compile(
      '<div>{{#if condition}}<p>{{value}}</p>{{else}}<p>Nothing</p>{{/if}}</div>'
    );
    render(template, object);
    let valueNode: Node | null | undefined;
    if (
      assertNodeTagName(context.root.firstChild, 'div') &&
      assertNodeTagName(context.root.firstChild.firstChild, 'p')
    ) {
      valueNode = context.root.firstChild.firstChild.firstChild;
    }

    equalTokens(context.root, '<div><p>hello world</p></div>', 'Initial render');

    rerender();

    equalTokens(context.root, '<div><p>hello world</p></div>', 'After dirtying but not updating');
    if (
      assertNodeTagName(context.root.firstChild, 'div') &&
      assertNodeTagName(context.root.firstChild.firstChild, 'p')
    ) {
      assert.strictEqual(
        context.root.firstChild.firstChild.firstChild,
        valueNode,
        'The text node was not blown away'
      );
    }

    // Even though the #if was stable, a dirty child node is updated
    object.value = 'goodbye world';
    rerender();
    equalTokens(context.root, '<div><p>goodbye world</p></div>', 'After updating and dirtying');
    if (
      assertNodeTagName(context.root.firstChild, 'div') &&
      assertNodeTagName(context.root.firstChild.firstChild, 'p')
    ) {
      assert.strictEqual(
        context.root.firstChild.firstChild.firstChild,
        valueNode,
        'The text node was not blown away'
      );
    }

    object.condition = false;
    rerender();
    equalTokens(context.root, '<div><p>Nothing</p></div>', 'And then dirtying');
    if (
      assertNodeTagName(context.root.firstChild, 'div') &&
      assertNodeTagName(context.root.firstChild.firstChild, 'p')
    ) {
      assert.notStrictEqual(
        context.root.firstChild.firstChild.firstChild,
        valueNode,
        'The text node was not blown away'
      );
    }
  });

  test('The if helper should consider an empty array falsy', function() {
    let object: any = { condition: [], value: 'hello world' };
    let template = compile(
      '<div>{{#if condition}}<p>{{value}}</p>{{else}}<p>Nothing</p>{{/if}}</div>'
    );
    render(template, object);

    equalTokens(context.root, '<div><p>Nothing</p></div>');

    object.condition.push('thing');
    rerender();
    equalTokens(context.root, '<div><p>hello world</p></div>', 'Initial render');
    object.condition.pop();
    rerender();
    equalTokens(context.root, '<div><p>Nothing</p></div>');
  });

  test('a simple implementation of a dirtying rerender without else', () => {
    let object = { condition: true, value: 'hello world' };
    let template = compile('<div>{{#if condition}}<p>{{value}}</p>{{/if}}</div>');
    render(template, object);

    equalTokens(context.root, '<div><p>hello world</p></div>', 'Initial render');

    object.condition = false;

    rerender();
    equalTokens(
      context.root,
      '<div><!----></div>',
      'If the condition is false, the morph becomes empty'
    );

    object.condition = true;

    rerender();
    equalTokens(
      context.root,
      '<div><p>hello world</p></div>',
      'If the condition is true, the morph repopulates'
    );
  });

  test('The unless helper without else', function() {
    let object: any = { condition: true, value: 'hello world' };
    let template = compile('<div>{{#unless condition}}<p>{{value}}</p>{{/unless}}</div>');
    render(template, object);

    equalTokens(context.root, '<div><!----></div>', 'Initial render');

    object.condition = false;
    rerender();
    equalTokens(
      context.root,
      '<div><p>hello world</p></div>',
      'If the condition is false, the morph becomes populated'
    );
    object.condition = true;
    rerender();
    equalTokens(
      context.root,
      '<div><!----></div>',
      'If the condition is true, the morph unpopulated'
    );
  });

  test('The unless helper with else', function() {
    let object: any = { condition: true, value: 'hello world' };
    let template = compile(
      '<div>{{#unless condition}}<p>{{value}}</p>{{else}}<p>Nothing</p>{{/unless}}</div>'
    );

    render(template, object);

    equalTokens(context.root, '<div><p>Nothing</p></div>', 'Initial render');

    object.condition = false;
    rerender();
    equalTokens(
      context.root,
      '<div><p>hello world</p></div>',
      'If the condition is false, the default renders'
    );
    object.condition = true;
    rerender();
    equalTokens(
      context.root,
      '<div><p>Nothing</p></div>',
      'If the condition is true, the else renders'
    );
  });

  test('The unless helper should consider an empty array falsy', function() {
    let object: any = { condition: [], value: 'hello world' };
    let template = compile(
      '<div>{{#unless condition}}<p>{{value}}</p>{{else}}<p>Nothing</p>{{/unless}}</div>'
    );

    render(template, object);

    equalTokens(context.root, '<div><p>hello world</p></div>', 'Initial render');

    object.condition.push(1);
    rerender();
    equalTokens(
      context.root,
      '<div><p>Nothing</p></div>',
      'If the condition is true, the else renders'
    );

    object.condition.pop();
    rerender();
    equalTokens(
      context.root,
      '<div><p>hello world</p></div>',
      'If the condition is false, the default renders'
    );
  });

  test('a conditional that is false on the first run', () => {
    let object = { condition: false, value: 'hello world' };
    let template = compile('<div>{{#if condition}}<p>{{value}}</p>{{/if}}</div>');
    render(template, object);

    equalTokens(context.root, '<div><!----></div>', 'Initial render');

    object.condition = true;

    rerender();
    equalTokens(
      context.root,
      '<div><p>hello world</p></div>',
      'If the condition is true, the morph populates'
    );

    object.condition = false;

    rerender();
    equalTokens(
      context.root,
      '<div><!----></div>',
      'If the condition is false, the morph is empty'
    );
  });

  test('block arguments', () => {
    let template = compile('<div>{{#with person.name.first as |f|}}{{f}}{{/with}}</div>');

    let object = { person: { name: { first: 'Godfrey', last: 'Chan' } } };
    render(template, object);

    equalTokens(context.root, '<div>Godfrey</div>', 'Initial render');

    object.person.name.first = 'Godfreak';
    rerender();

    equalTokens(context.root, '<div>Godfreak</div>', 'After updating');

    rerender({ person: { name: { first: 'Godfrey', last: 'Chan' } } });

    equalTokens(context.root, '<div>Godfrey</div>', 'After reset');
  });

  test('block arguments should have higher presedence than helpers', () => {
    registerHelper(context.registry, 'foo', () => 'foo-helper');
    registerHelper(context.registry, 'bar', () => 'bar-helper');
    registerHelper(context.registry, 'echo', args => args[0]);

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

    equalTokens(
      context.root,
      trimLines`
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
      </div>`,
      'Initial render'
    );

    rerender();

    equalTokens(
      context.root,
      trimLines`
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
      </div>`,
      'After no-op re-render'
    );

    object.value = 'NEW-VALUE';
    rerender();

    equalTokens(
      context.root,
      trimLines`
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
      </div>`,
      'After update'
    );

    rerender({ foo: 'foo-value', bar: 'bar-value', value: 'value-value' });

    equalTokens(
      context.root,
      trimLines`
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
      </div>`,
      'After reset'
    );
  });

  test('block arguments (ensure balanced push/pop)', () => {
    let template = compile('<div>{{#with person.name.first as |f|}}{{f}}{{/with}}{{f}}</div>');

    let object = { person: { name: { first: 'Godfrey', last: 'Chan' } }, f: 'Outer' };
    render(template, object);

    equalTokens(context.root, '<div>GodfreyOuter</div>', 'Initial render');

    object.person.name.first = 'Godfreak';
    rerender();

    equalTokens(context.root, '<div>GodfreakOuter</div>', 'After updating');
  });

  test('block arguments cannot be accessed through {{this}}', () => {
    registerHelper(context.registry, 'noop', params => params[0]);

    let template = compile(stripTight`
      <div>
        [{{#with person as |name|}}{{this.name}}{{/with}}]
        [{{#with person as |name|}}{{#with this.name as |test|}}{{test}}{{/with}}{{/with}}]
        [{{#with person as |name|}}{{#with (noop this.name) as |test|}}{{test}}{{/with}}{{/with}}]
      </div>`);

    let object = { person: 'Yehuda', name: 'Godfrey' };
    render(template, object);

    equalTokens(context.root, '<div>[Godfrey][Godfrey][Godfrey]</div>', 'Initial render');

    rerender();

    equalTokens(context.root, '<div>[Godfrey][Godfrey][Godfrey]</div>', 'Initial render');

    object.name = 'Godfreak';
    rerender();

    equalTokens(context.root, '<div>[Godfreak][Godfreak][Godfreak]</div>', 'After update');

    object.name = 'Godfrey';
    rerender();

    equalTokens(context.root, '<div>[Godfrey][Godfrey][Godfrey]</div>', 'After reset');
  });

  test('The with helper should consider an empty array falsy', () => {
    let object = { condition: [] as number[] };
    let template = compile('<div>{{#with condition as |c|}}{{c.length}}{{/with}}</div>');
    render(template, object);

    equalTokens(context.root, '<div><!----></div>', 'Initial render');

    object.condition.push(1);
    rerender();

    equalTokens(context.root, '<div>1</div>', 'After updating');
  });

  test('block helpers whose template has a morph at the edge', assert => {
    let template = compile('{{#identity}}{{value}}{{/identity}}');
    let object = { value: 'hello world' };
    render(template, object);

    equalTokens(context.root, 'hello world');
    let firstNode = result.firstNode();
    assert.notStrictEqual(firstNode, null, 'first node should have rendered');
    if (firstNode !== null) {
      assert.equal(firstNode.nodeType, 3, 'the first node of the helper should be a text node');
      assert.equal(firstNode.nodeValue, 'hello world', 'its content should be hello world');

      assert.strictEqual(firstNode.nextSibling, null, 'there should only be one nodes');
    }
  });

  test("clean content doesn't get blown away", assert => {
    let template = compile('<div>{{value}}</div>');
    let object = { value: 'hello' };
    render(template, object);

    let firstNode: Option<SimpleNode> = result.firstNode();
    let textNode: Node | null;
    if (assertNodeTagName(firstNode, 'div')) {
      textNode = firstNode.firstChild;
      assert.equal(textNode && textNode.nodeValue, 'hello');
    }

    object.value = 'goodbye';
    rerender();

    equalTokens(context.root, '<div>goodbye</div>');

    object.value = 'hello';
    rerender();

    firstNode = context.root.firstChild;
    if (assertNodeTagName(firstNode, 'div')) {
      textNode = firstNode.firstChild;
      assert.equal(textNode && textNode.nodeValue, 'hello');
    }
  });

  test('helper calls follow the normal dirtying rules', () => {
    registerHelper(context.registry, 'capitalize', function(params) {
      let value = params[0];
      if (value !== null && value !== undefined && typeof value === 'string') {
        return value.toUpperCase();
      }
      return;
    });

    let template = compile('<div>{{capitalize value}}</div>');
    let object = { value: 'hello' };
    render(template, object);

    let div = result.firstNode();
    if (assertNodeTagName(div, 'div')) {
      assertProperty(div.firstChild, 'nodeValue', 'HELLO');
    }

    object.value = 'goodbye';
    rerender();

    equalTokens(context.root, '<div>GOODBYE</div>');

    rerender();

    equalTokens(context.root, '<div>GOODBYE</div>');

    // Checks normalized value, not raw value
    object.value = 'GoOdByE';
    rerender();

    if (assertNodeTagName(context.root.firstChild, 'div')) {
      assertProperty(context.root.firstChild.firstChild, 'nodeValue', 'GOODBYE');
    }
  });

  test('class attribute follow the normal dirtying rules', () => {
    let template = compile("<div class='{{value}}'>hello</div>");
    let object = { value: 'world' };

    render(template, object);

    equalTokens(context.root, "<div class='world'>hello</div>", 'Initial render');

    object.value = 'universe';
    rerender();

    equalTokens(context.root, "<div class='universe'>hello</div>", 'Revalidating without dirtying');

    rerender();

    equalTokens(context.root, "<div class='universe'>hello</div>", 'Revalidating after dirtying');

    object.value = 'world';
    rerender();

    equalTokens(context.root, "<div class='world'>hello</div>", 'Revalidating after dirtying');
  });

  test('class attribute w/ concat follow the normal dirtying rules', () => {
    let template = compile("<div class='hello {{value}}'>hello</div>");
    let object = { value: 'world' as string | null };
    render(template, object);

    equalTokens(context.root, "<div class='hello world'>hello</div>");

    rerender();

    equalTokens(context.root, "<div class='hello world'>hello</div>");

    object.value = 'universe';
    rerender();

    equalTokens(context.root, "<div class='hello universe'>hello</div>");

    object.value = null;
    rerender();

    equalTokens(context.root, "<div class='hello '>hello</div>");

    object.value = 'world';
    rerender();

    equalTokens(context.root, "<div class='hello world'>hello</div>");
  });

  test('class attribute is removed if the binding becomes null or undefined', () => {
    let template = compile('<div class={{value}}>hello</div>');
    let object: { value: any } = { value: 'foo' };
    render(template, object);

    equalTokens(context.root, "<div class='foo'>hello</div>");

    rerender();

    equalTokens(context.root, "<div class='foo'>hello</div>");

    object.value = null;
    rerender();

    equalTokens(context.root, '<div>hello</div>');

    object.value = 0;
    rerender();

    equalTokens(context.root, "<div class='0'>hello</div>");

    object.value = undefined;
    rerender();

    equalTokens(context.root, '<div>hello</div>');

    object.value = 'foo';
    rerender();

    equalTokens(context.root, "<div class='foo'>hello</div>");
  });

  test('attribute nodes follow the normal dirtying rules', () => {
    let template = compile("<div data-value='{{value}}'>hello</div>");
    let object = { value: 'world' as string | null };

    render(template, object);

    equalTokens(context.root, "<div data-value='world'>hello</div>", 'Initial render');

    object.value = 'universe';
    rerender();

    equalTokens(
      context.root,
      "<div data-value='universe'>hello</div>",
      'Revalidating without dirtying'
    );

    rerender();

    equalTokens(
      context.root,
      "<div data-value='universe'>hello</div>",
      'Revalidating after dirtying'
    );

    object.value = null;
    rerender();

    equalTokens(context.root, '<div>hello</div>', 'Revalidating after dirtying');

    object.value = 'world';
    rerender();

    equalTokens(context.root, "<div data-value='world'>hello</div>", 'Revalidating after dirtying');
  });

  test('attribute nodes w/ concat follow the normal dirtying rules', () => {
    let template = compile("<div data-value='hello {{value}}'>hello</div>");
    let object = { value: 'world' as string | null };
    render(template, object);

    equalTokens(context.root, "<div data-value='hello world'>hello</div>");

    rerender();

    equalTokens(context.root, "<div data-value='hello world'>hello</div>");

    object.value = 'universe';
    rerender();

    equalTokens(context.root, "<div data-value='hello universe'>hello</div>");

    object.value = null;
    rerender();

    equalTokens(context.root, "<div data-value='hello '>hello</div>");

    object.value = 'world';
    rerender();

    equalTokens(context.root, "<div data-value='hello world'>hello</div>");
  });

  test('attributes values are normalized correctly', () => {
    let template = compile('<div data-value={{value}}>hello</div>');
    let object = {
      value: {
        toString() {
          return 'world';
        },
      },
    };

    render(template, object);

    equalTokens(context.root, "<div data-value='world'>hello</div>", 'Initial render');

    rerender();

    equalTokens(context.root, "<div data-value='world'>hello</div>", 'Initial render');

    object.value = 123;
    rerender();

    equalTokens(context.root, "<div data-value='123'>hello</div>", 'Revalidating without dirtying');

    rerender();

    equalTokens(context.root, "<div data-value='123'>hello</div>", 'Revalidating after dirtying');

    object.value = false;
    rerender();

    equalTokens(context.root, '<div>hello</div>', 'Revalidating after dirtying');

    rerender();

    equalTokens(context.root, '<div>hello</div>', 'Revalidating after dirtying');

    object.value = {
      toString() {
        return 'world';
      },
    };
    rerender();

    equalTokens(context.root, "<div data-value='world'>hello</div>", 'Revalidating after dirtying');
  });

  test('namespaced attribute nodes follow the normal dirtying rules', () => {
    let template = compile("<div xml:lang='{{lang}}'>hello</div>");
    let object = { lang: 'en-us' };

    render(template, object);

    equalTokens(context.root, "<div xml:lang='en-us'>hello</div>", 'Initial render');

    object.lang = 'en-uk';
    rerender();

    equalTokens(context.root, "<div xml:lang='en-uk'>hello</div>", 'Revalidating without dirtying');

    rerender();

    equalTokens(context.root, "<div xml:lang='en-uk'>hello</div>", 'Revalidating after dirtying');
  });

  test('namespaced attribute nodes w/ concat follow the normal dirtying rules', () => {
    let template = compile("<div xml:lang='en-{{locale}}'>hello</div>");
    let object = { locale: 'us' as string | null };

    render(template, object);

    equalTokens(context.root, "<div xml:lang='en-us'>hello</div>", 'Initial render');

    rerender();

    equalTokens(context.root, "<div xml:lang='en-us'>hello</div>", 'No-op rerender');

    object.locale = 'uk';
    rerender();

    equalTokens(context.root, "<div xml:lang='en-uk'>hello</div>", 'After update');

    object.locale = null;
    rerender();

    equalTokens(context.root, "<div xml:lang='en-'>hello</div>", 'After updating to null');

    object.locale = 'us';
    rerender();

    equalTokens(context.root, "<div xml:lang='en-us'>hello</div>", 'After reset');
  });

  test('non-standard namespaced attribute nodes follow the normal dirtying rules', () => {
    let template = compile("<div epub:type='{{type}}'>hello</div>");
    let object = { type: 'dedication' };

    render(template, object);

    equalTokens(context.root, "<div epub:type='dedication'>hello</div>", 'Initial render');

    object.type = 'backmatter';
    rerender();

    equalTokens(
      context.root,
      "<div epub:type='backmatter'>hello</div>",
      'Revalidating without dirtying'
    );

    rerender();

    equalTokens(
      context.root,
      "<div epub:type='backmatter'>hello</div>",
      'Revalidating after dirtying'
    );
  });

  test('non-standard namespaced attribute nodes w/ concat follow the normal dirtying rules', () => {
    let template = compile("<div epub:type='dedication {{type}}'>hello</div>");
    let object = { type: 'backmatter' as string | null };

    render(template, object);

    equalTokens(
      context.root,
      "<div epub:type='dedication backmatter'>hello</div>",
      'Initial render'
    );

    rerender();

    equalTokens(
      context.root,
      "<div epub:type='dedication backmatter'>hello</div>",
      'No-op rerender'
    );

    object.type = 'index';
    rerender();

    equalTokens(context.root, "<div epub:type='dedication index'>hello</div>", 'After update');

    object.type = null;
    rerender();

    equalTokens(context.root, "<div epub:type='dedication '>hello</div>", 'After updating to null');

    object.type = 'backmatter';
    rerender();

    equalTokens(context.root, "<div epub:type='dedication backmatter'>hello</div>", 'After reset');
  });

  test('<option selected> is normalized and updated correctly', assert => {
    function assertSelected(expectedSelected: string[], label: string) {
      let options = getElementsByTagName(context.root, 'option');
      let actualSelected = [];
      for (let i = 0; i < options.length; i++) {
        let option = options[i];
        // TODO: these type errors reflect real incompatibility with
        // SimpleDOM
        if ((option as any).selected) {
          actualSelected.push((option as any).value);
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
      two: 'is-true' as string | boolean,
      three: undefined as undefined | null | boolean,
      four: null as undefined | null | string,
      five: false,
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

    equalTokens(context.root, expectedInitialTokens, 'initial render tokens');
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

  test('top-level bounds are correct when swapping order', assert => {
    let template = compile("{{#each list key='key' as |item|}}{{item.name}}{{/each}}");

    let tom = { key: '1', name: 'Tom Dale', class: 'tomdale' };
    let yehuda = { key: '2', name: 'Yehuda Katz', class: 'wycats' };
    let object = { list: [tom, yehuda] };

    render(template, object);
    assertInvariants(assert, result, 'initial render');

    rerender();
    assertInvariants(assert, result, 'after no-op rerender');

    object = { list: [yehuda, tom] };
    rerender(object);
    assertInvariants(assert, result, 'after reordering');

    object = { list: [tom] };
    rerender(object);
    assertInvariants(assert, result, 'after deleting from the front');

    object = { list: [] };
    rerender(object);
    assertInvariants(assert, result, 'after emptying the list');
  });

  test('top-level bounds are correct when toggling conditionals', assert => {
    let template = compile('{{#if item}}{{item.name}}{{/if}}');

    let tom = { name: 'Tom Dale' };
    let yehuda = { name: 'Yehuda Katz' };
    let object = { item: tom as typeof tom | null };

    render(template, object);
    assertInvariants(assert, result, 'initial render');

    rerender();
    assertInvariants(assert, result, 'after no-op rerender');

    object = { item: yehuda };
    rerender(object);
    assertInvariants(assert, result, 'after replacement');

    object = { item: null };
    rerender(object);
    assertInvariants(assert, result, 'after nulling');
  });

  test('top-level bounds are correct when changing innerHTML', assert => {
    let template = compile('{{{html}}}');

    let object = { html: '<b>inner</b>-<b>before</b>' };

    render(template, object);
    assertInvariants(assert, result, 'initial render');

    rerender();
    assertInvariants(assert, result, 'after no-op rerender');

    object = { html: '<p>inner-after</p>' };
    rerender(object);
    assertInvariants(assert, result, 'after replacement');

    object = { html: '' };
    rerender(object);
    assertInvariants(assert, result, 'after emptying');
  });

  testEachHelper(
    'An implementation of #each using block params',
    "<ul>{{#each list key='key' as |item|}}<li class='{{item.class}}'>{{item.name}}</li>{{/each}}</ul>"
  );

  test('The each helper with empty string items', assert => {
    let template = compile(
      `<ul>{{#each list key='@identity' as |item|}}<li>{{item}}</li>{{/each}}</ul>`
    );

    let object = { list: [''] };
    render(template, object);

    let items = getElementsByTagName(context.root, 'li');
    let lastNode = items[items.length - 1];

    equalTokens(context.root, '<ul><li></li></ul>', 'Initial render');

    object = { list: ['first!', ''] };
    rerender(object);

    equalTokens(context.root, '<ul><li>first!</li><li></li></ul>', 'After prepending list item');

    let newItems = getElementsByTagName(context.root, 'li');
    let newLastNode = newItems[newItems.length - 1];

    assert.strictEqual(
      newLastNode,
      lastNode,
      'The last node has not changed after prepending to list'
    );
  });

  test('The each helper with else', assert => {
    let object = { list: [] as any[] };
    let template = compile(
      `<ul>{{#each list key='name' as |item|}}<li class="{{item.class}}">{{item.name}}</li>{{else}}<li class="none">none</li>{{/each}}</ul>`
    );

    render(template, object);

    let itemNode = getNodeByClassName('none');
    let textNode = getFirstChildOfNode('none');

    equalTokens(context.root, `<ul><li class="none">none</li></none`);

    rerender(object);
    assertStableNodes('none', 'after no-op rerender');

    object = { list: [{ name: 'Foo Bar', class: 'foobar' }] };
    rerender(object);

    equalTokens(context.root, '<ul><li class="foobar">Foo Bar</li></ul>');

    object = { list: [] };
    rerender(object);

    equalTokens(context.root, '<ul><li class="none">none</li></ul>');

    function assertStableNodes(className: string, message: string) {
      assert.strictEqual(
        getNodeByClassName(className),
        itemNode,
        'The item node has not changed ' + message
      );
      assert.strictEqual(
        getFirstChildOfNode(className),
        textNode,
        'The text node has not changed ' + message
      );
    }
  });

  test('The each helper yields the index of the current item current item when using the @index key', assert => {
    let tom = { name: 'Tom Dale', class: 'tomdale' };
    let yehuda = { name: 'Yehuda Katz', class: 'wycats' };
    let object = { list: [tom, yehuda] };
    let template = compile(
      "<ul>{{#each list key='@index' as |item index|}}<li class='{{item.class}}'>{{item.name}}<p class='index-{{index}}'>{{index}}</p></li>{{/each}}</ul>"
    );

    render(template, object);

    let itemNode = getNodeByClassName('tomdale');
    let indexNode = getNodeByClassName('index-0');
    let nameNode = getFirstChildOfNode('tomdale');

    equalTokens(
      context.root,
      "<ul><li class='tomdale'>Tom Dale<p class='index-0'>0</p></li><li class='wycats'>Yehuda Katz<p class='index-1'>1</p></li></ul>",
      'Initial render'
    );

    rerender();
    assertStableNodes('tomdale', 0, 'after no-op rerender');
    equalTokens(
      context.root,
      "<ul><li class='tomdale'>Tom Dale<p class='index-0'>0</p></li><li class='wycats'>Yehuda Katz<p class='index-1'>1</p></li></ul>",
      'After no-op render'
    );

    rerender();
    assertStableNodes('tomdale', 0, 'after non-dirty rerender');
    equalTokens(
      context.root,
      "<ul><li class='tomdale'>Tom Dale<p class='index-0'>0</p></li><li class='wycats'>Yehuda Katz<p class='index-1'>1</p></li></ul>",
      'After non-dirty render'
    );

    object = { list: [yehuda, tom] };
    rerender(object);
    equalTokens(
      context.root,
      "<ul><li class='wycats'>Yehuda Katz<p class='index-0'>0</p></li><li class='tomdale'>Tom Dale<p class='index-1'>1</p></li></ul>",
      'After changing list order'
    );
    assert.strictEqual(
      getNodeByClassName(`index-0`),
      indexNode,
      'The index node has not changed after changing list order'
    );

    object = {
      list: [{ name: 'Martin Muñoz', class: 'mmun' }, { name: 'Kris Selden', class: 'krisselden' }],
    };
    rerender(object);
    assertStableNodes('mmun', 0, 'after changing the list entries, but with stable keys');
    equalTokens(
      context.root,
      `<ul><li class='mmun'>Martin Muñoz<p class='index-0'>0</p></li><li class='krisselden'>Kris Selden<p class='index-1'>1</p></li></ul>`,
      `After changing the list entries, but with stable keys`
    );

    object = {
      list: [
        { name: 'Martin Muñoz', class: 'mmun' },
        { name: 'Kristoph Selden', class: 'krisselden' },
        { name: 'Matthew Beale', class: 'mixonic' },
      ],
    };

    rerender(object);
    assertStableNodes('mmun', 0, 'after adding an additional entry');
    equalTokens(
      context.root,
      stripTight`<ul>
        <li class='mmun'>Martin Muñoz<p class='index-0'>0</p></li>
        <li class='krisselden'>Kristoph Selden<p class='index-1'>1</p></li>
        <li class='mixonic'>Matthew Beale<p class='index-2'>2</p></li></ul>`,
      `After adding an additional entry`
    );

    object = {
      list: [{ name: 'Martin Muñoz', class: 'mmun' }, { name: 'Matthew Beale', class: 'mixonic' }],
    };

    rerender(object);
    assertStableNodes('mmun', 0, 'after removing the middle entry');
    equalTokens(
      context.root,
      "<ul><li class='mmun'>Martin Muñoz<p class='index-0'>0</p></li><li class='mixonic'>Matthew Beale<p class='index-1'>1</p></li></ul>",
      'after removing the middle entry'
    );

    object = {
      list: [
        { name: 'Martin Muñoz', class: 'mmun' },
        { name: 'Stefan Penner', class: 'stefanpenner' },
        { name: 'Robert Jackson', class: 'rwjblue' },
      ],
    };

    rerender(object);
    assertStableNodes('mmun', 0, 'after adding two more entries');
    equalTokens(
      context.root,
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
      list: [{ name: 'Robert Jackson', class: 'rwjblue' }],
    };

    rerender(object);
    equalTokens(
      context.root,
      "<ul><li class='rwjblue'>Robert Jackson<p class='index-0'>0</p></li></ul>",
      'After removing two entries'
    );

    object = {
      list: [
        { name: 'Martin Muñoz', class: 'mmun' },
        { name: 'Stefan Penner', class: 'stefanpenner' },
        { name: 'Robert Jackson', class: 'rwjblue' },
      ],
    };

    rerender(object);
    equalTokens(
      context.root,
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
      list: [{ name: 'Martin Muñoz', class: 'mmun' }],
    };

    rerender(object);
    assertStableNodes('mmun', 0, 'after removing from the back');
    equalTokens(
      context.root,
      "<ul><li class='mmun'>Martin Muñoz<p class='index-0'>0</p></li></ul>",
      'After removing from the back'
    );

    object = { list: [] };

    rerender(object);
    if (assertNodeTagName(context.root.firstChild, 'ul')) {
      assert.strictEqual(
        context.root.firstChild.firstChild && context.root.firstChild.firstChild.nodeType,
        8,
        "there are no li's after removing the remaining entry"
      );
      equalTokens(context.root, '<ul><!----></ul>', 'After removing the remaining entries');
    }

    function assertStableNodes(className: string, index: number, message: string) {
      assert.strictEqual(
        getNodeByClassName(className),
        itemNode,
        'The item node has not changed ' + message
      );
      assert.strictEqual(
        getNodeByClassName(`index-${index}`),
        indexNode,
        'The index node has not changed ' + message
      );
      assert.strictEqual(
        getFirstChildOfNode(className),
        nameNode,
        'The name node has not changed ' + message
      );
    }
  });

  test('The each helper yields the index of the current item when using a non-@index key', assert => {
    let tom = { key: '1', name: 'Tom Dale', class: 'tomdale' };
    let yehuda = { key: '2', name: 'Yehuda Katz', class: 'wycats' };
    let object = { list: [tom, yehuda] };
    let template = compile(
      "<ul>{{#each list key='key' as |item index|}}<li class='{{item.class}}'>{{item.name}}<p class='index-{{index}}'>{{index}}</p></li>{{/each}}</ul>"
    );

    render(template, object);

    let itemNode = getNodeByClassName('tomdale');
    let indexNode = getNodeByClassName('index-0');
    let nameNode = getFirstChildOfNode('tomdale');

    equalTokens(
      context.root,
      "<ul><li class='tomdale'>Tom Dale<p class='index-0'>0</p></li><li class='wycats'>Yehuda Katz<p class='index-1'>1</p></li></ul>",
      'Initial render'
    );

    rerender();
    assertStableNodes('tomdale', 0, 'after no-op rerender');
    equalTokens(
      context.root,
      "<ul><li class='tomdale'>Tom Dale<p class='index-0'>0</p></li><li class='wycats'>Yehuda Katz<p class='index-1'>1</p></li></ul>",
      'After no-op render'
    );

    rerender();
    assertStableNodes('tomdale', 0, 'after non-dirty rerender');
    equalTokens(
      context.root,
      "<ul><li class='tomdale'>Tom Dale<p class='index-0'>0</p></li><li class='wycats'>Yehuda Katz<p class='index-1'>1</p></li></ul>",
      'After non-dirty render'
    );

    object = { list: [yehuda, tom] };
    rerender(object);
    equalTokens(
      context.root,
      "<ul><li class='wycats'>Yehuda Katz<p class='index-0'>0</p></li><li class='tomdale'>Tom Dale<p class='index-1'>1</p></li></ul>",
      'After changing list order'
    );
    assert.strictEqual(
      getNodeByClassName('index-1'),
      indexNode,
      'The index node has been moved after changing list order'
    );

    object = {
      list: [
        { key: '1', name: 'Martin Muñoz', class: 'mmun' },
        { key: '2', name: 'Kris Selden', class: 'krisselden' },
      ],
    };
    rerender(object);
    assertStableNodes('mmun', 0, 'after changing the list entries, but with stable keys');
    equalTokens(
      context.root,
      `<ul><li class='mmun'>Martin Muñoz<p class='index-0'>0</p></li><li class='krisselden'>Kris Selden<p class='index-1'>1</p></li></ul>`,
      `After changing the list entries, but with stable keys`
    );

    object = {
      list: [
        { key: '1', name: 'Martin Muñoz', class: 'mmun' },
        { key: '2', name: 'Kristoph Selden', class: 'krisselden' },
        { key: '3', name: 'Matthew Beale', class: 'mixonic' },
      ],
    };

    rerender(object);
    assertStableNodes('mmun', 0, 'after adding an additional entry');
    equalTokens(
      context.root,
      stripTight`<ul>
        <li class='mmun'>Martin Muñoz<p class='index-0'>0</p></li>
        <li class='krisselden'>Kristoph Selden<p class='index-1'>1</p></li>
        <li class='mixonic'>Matthew Beale<p class='index-2'>2</p></li></ul>`,
      `After adding an additional entry`
    );

    object = {
      list: [
        { key: '1', name: 'Martin Muñoz', class: 'mmun' },
        { key: '3', name: 'Matthew Beale', class: 'mixonic' },
      ],
    };

    rerender(object);
    assertStableNodes('mmun', 0, 'after removing the middle entry');
    equalTokens(
      context.root,
      "<ul><li class='mmun'>Martin Muñoz<p class='index-0'>0</p></li><li class='mixonic'>Matthew Beale<p class='index-1'>1</p></li></ul>",
      'after removing the middle entry'
    );

    object = {
      list: [
        { key: '1', name: 'Martin Muñoz', class: 'mmun' },
        { key: '4', name: 'Stefan Penner', class: 'stefanpenner' },
        { key: '5', name: 'Robert Jackson', class: 'rwjblue' },
      ],
    };

    rerender(object);
    assertStableNodes('mmun', 0, 'after adding two more entries');
    equalTokens(
      context.root,
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
      list: [{ key: '5', name: 'Robert Jackson', class: 'rwjblue' }],
    };

    rerender(object);
    assertStableNodes('rwjblue', 0, 'after removing two entries');
    equalTokens(
      context.root,
      "<ul><li class='rwjblue'>Robert Jackson<p class='index-0'>0</p></li></ul>",
      'After removing two entries'
    );

    object = {
      list: [
        { key: '1', name: 'Martin Muñoz', class: 'mmun' },
        { key: '4', name: 'Stefan Penner', class: 'stefanpenner' },
        { key: '5', name: 'Robert Jackson', class: 'rwjblue' },
      ],
    };

    rerender(object);
    assertStableNodes('rwjblue', 2, 'after adding back entries');
    equalTokens(
      context.root,
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
      list: [{ key: '1', name: 'Martin Muñoz', class: 'mmun' }],
    };

    rerender(object);
    assertStableNodes('mmun', 0, 'after removing from the back');
    equalTokens(
      context.root,
      "<ul><li class='mmun'>Martin Muñoz<p class='index-0'>0</p></li></ul>",
      'After removing from the back'
    );

    object = { list: [] };

    rerender(object);
    if (assertNodeTagName(context.root.firstChild, 'ul')) {
      assert.strictEqual(
        context.root.firstChild.firstChild && context.root.firstChild.firstChild.nodeType,
        8,
        "there are no li's after removing the remaining entry"
      );
    }
    equalTokens(context.root, '<ul><!----></ul>', 'After removing the remaining entries');

    function assertStableNodes(className: string, index: number, message: string) {
      assert.strictEqual(
        getNodeByClassName(className),
        itemNode,
        'The item node has not changed ' + message
      );
      assert.strictEqual(
        getNodeByClassName(`index-${index}`),
        indexNode,
        'The index node has not changed ' + message
      );
      assert.strictEqual(
        getFirstChildOfNode(className),
        nameNode,
        'The name node has not changed ' + message
      );
    }
  });

  // TODO: port https://github.com/emberjs/ember.js/pull/14082

  function testEachHelper(testName: string, templateSource: string, testMethod = QUnit.test) {
    testMethod(testName, assert => {
      let template = compile(templateSource);
      let tom = { key: '1', name: 'Tom Dale', class: 'tomdale' };
      let yehuda = { key: '2', name: 'Yehuda Katz', class: 'wycats' };
      let object = { list: [tom, yehuda] };

      render(template, object);

      let itemNode = getNodeByClassName('tomdale');
      let nameNode = getFirstChildOfNode('tomdale');

      equalTokens(
        context.root,
        "<ul><li class='tomdale'>Tom Dale</li><li class='wycats'>Yehuda Katz</li></ul>",
        'Initial render'
      );

      rerender();
      assertStableNodes('tomdale', 'after no-op rerender');
      equalTokens(
        context.root,
        "<ul><li class='tomdale'>Tom Dale</li><li class='wycats'>Yehuda Katz</li></ul>",
        'After no-op re-render'
      );

      rerender();
      assertStableNodes('tomdale', 'after non-dirty rerender');
      equalTokens(
        context.root,
        "<ul><li class='tomdale'>Tom Dale</li><li class='wycats'>Yehuda Katz</li></ul>",
        'After non-dirty re-render'
      );

      object = { list: [yehuda, tom] };
      rerender(object);
      assertStableNodes('tomdale', 'after changing the list order');
      equalTokens(
        context.root,
        "<ul><li class='wycats'>Yehuda Katz</li><li class='tomdale'>Tom Dale</li></ul>",
        'After changing the list order'
      );

      function assertStableNodes(className: string, message: string) {
        assert.strictEqual(
          getNodeByClassName(className),
          itemNode,
          'The item node has not changed ' + message
        );
        assert.strictEqual(
          getFirstChildOfNode(className),
          nameNode,
          'The name node has not changed ' + message
        );
      }
    });
  }
});

QUnit.module('Updating SVG', hooks => {
  hooks.beforeEach(() => commonSetup());

  test('HTML namespace from context.root element is continued to child templates', assert => {
    let object = { hasCircle: true };
    let template = compile('<svg>{{#if hasCircle}}<circle />{{/if}}</svg>');
    render(template, object);

    function assertNamespaces() {
      if (assertNodeTagName(context.root.firstChild, 'svg')) {
        assert.equal(context.root.firstChild.namespaceURI, SVG_NAMESPACE);
        if (assertNodeTagName(context.root.firstChild.firstChild, 'circle')) {
          assert.equal(context.root.firstChild.firstChild.namespaceURI, SVG_NAMESPACE);
        }
      }
    }

    equalTokens(context.root, '<svg><circle /></svg>');
    assertNamespaces();

    rerender();

    equalTokens(context.root, '<svg><circle /></svg>');
    assertNamespaces();

    object.hasCircle = false;
    rerender();

    equalTokens(context.root, '<svg><!----></svg>');

    rerender({ hasCircle: true });

    equalTokens(context.root, '<svg><circle /></svg>');
    assertNamespaces();
  });

  test('context.root <foreignObject> tag is SVG namespaced', assert => {
    let object = { hasForeignObject: true };
    let template = compile(
      '{{#if hasForeignObject}}<foreignObject><div></div></foreignObject>{{/if}}'
    );

    let parent = context.root;
    let svg = context.doc.createElementNS(SVG_NAMESPACE, 'svg');
    context.root.appendChild(svg);
    context.root = svg as any;

    render(template, object);

    function assertNamespaces() {
      if (assertNodeTagName(svg.firstChild, 'foreignObject')) {
        assert.equal(svg.firstChild.namespaceURI, SVG_NAMESPACE);
        if (assertNodeTagName(svg.firstChild.firstChild, 'div')) {
          assert.equal(svg.firstChild.firstChild.namespaceURI, XHTML_NAMESPACE);
        }
      }
    }

    equalTokens(parent, '<svg><foreignObject><div></div></foreignObject></svg>');
    assertNamespaces();

    rerender();

    equalTokens(parent, '<svg><foreignObject><div></div></foreignObject></svg>');
    assertNamespaces();

    object.hasForeignObject = false;
    rerender();

    equalTokens(parent, '<svg><!----></svg>');

    rerender({ hasForeignObject: true });

    equalTokens(parent, '<svg><foreignObject><div></div></foreignObject></svg>');
    assertNamespaces();
  });

  test('elements nested inside <foreignObject> have an XHTML namespace', assert => {
    let object = { hasDiv: true };
    let template = compile(
      '<svg><foreignObject>{{#if hasDiv}}<div></div>{{/if}}</foreignObject></svg>'
    );
    render(template, object);

    function assertNamespaces() {
      if (assertNodeTagName(context.root.firstChild, 'svg')) {
        assert.equal(context.root.firstChild.namespaceURI, SVG_NAMESPACE);
        if (assertNodeTagName(context.root.firstChild.firstChild, 'foreignObject')) {
          assert.equal(context.root.firstChild.firstChild.namespaceURI, SVG_NAMESPACE);
          if (assertNodeTagName(context.root.firstChild.firstChild.firstChild, 'div')) {
            assert.equal(
              context.root.firstChild.firstChild.firstChild.namespaceURI,
              XHTML_NAMESPACE
            );
          }
        }
      }
    }

    equalTokens(context.root, '<svg><foreignObject><div></div></foreignObject></svg>');
    assertNamespaces();

    rerender();

    equalTokens(context.root, '<svg><foreignObject><div></div></foreignObject></svg>');
    assertNamespaces();

    object.hasDiv = false;
    rerender();

    equalTokens(context.root, '<svg><foreignObject><!----></foreignObject></svg>');

    rerender({ hasDiv: true });

    equalTokens(context.root, '<svg><foreignObject><div></div></foreignObject></svg>');
    assertNamespaces();
  });

  test('Namespaced attribute with a quoted expression', assert => {
    let title = 'svg-title';
    let state = { title };
    let template = compile('<svg xlink:title="{{title}}">content</svg>');
    render(template, state);

    function assertNamespaces() {
      if (assertNodeTagName(context.root.firstChild, 'svg')) {
        assert.equal(context.root.firstChild.namespaceURI, SVG_NAMESPACE);
        let attr = context.root.firstChild.attributes[0];
        assert.equal(attr.namespaceURI, XLINK_NAMESPACE);
      }
    }

    equalTokens(context.root, `<svg xlink:title="${title}">content</svg>`);
    assertNamespaces();

    rerender();

    equalTokens(context.root, `<svg xlink:title="${title}">content</svg>`);
    assertNamespaces();

    state.title = 'mmun';
    rerender();

    equalTokens(context.root, `<svg xlink:title="${state.title}">content</svg>`);
    assertNamespaces();

    rerender({ title });

    equalTokens(context.root, `<svg xlink:title="${title}">content</svg>`);
    assertNamespaces();
  });

  test('<svg> tag and expression as sibling', assert => {
    let name = 'svg-title';
    let state: { name: string | null } = { name };
    let template = compile('<svg></svg>{{name}}');
    render(template, state);

    function assertNamespace() {
      if (assertNodeTagName(context.root.firstChild, 'svg')) {
        assert.equal(context.root.firstChild.namespaceURI, SVG_NAMESPACE);
      }
    }

    equalTokens(context.root, `<svg></svg>${name}`);
    assertNamespace();

    rerender();

    equalTokens(context.root, `<svg></svg>${name}`);
    assertNamespace();

    state.name = null;
    rerender();

    equalTokens(context.root, `<svg></svg>`);
    assertNamespace();

    rerender({ name });

    equalTokens(context.root, `<svg></svg>${name}`);
    assertNamespace();
  });

  test('<svg> tag and unsafe expression as sibling', assert => {
    let name = '<i>Biff</i>';
    let state = { name };
    let template = compile('<svg></svg>{{{name}}}');
    render(template, state);

    function assertNamespaces() {
      if (assertNodeTagName(context.root.firstChild, 'svg')) {
        assert.equal(context.root.firstChild.namespaceURI, SVG_NAMESPACE);
      }
      if (state.name === name && assertNodeTagName(context.root.lastChild, 'i')) {
        assert.equal(context.root.lastChild.namespaceURI, XHTML_NAMESPACE);
      }
    }

    equalTokens(context.root, `<svg></svg>${name}`);
    assertNamespaces();

    rerender();

    equalTokens(context.root, `<svg></svg>${name}`);
    assertNamespaces();

    state.name = 'ef4';
    rerender();

    equalTokens(context.root, `<svg></svg>${state.name}`);
    assertNamespaces();

    rerender({ name });

    equalTokens(context.root, `<svg></svg>${name}`);
    assertNamespaces();
  });

  test('unsafe expression nested inside a namespace', assert => {
    let content = '<path></path>';
    let state = { content };
    let template = compile('<svg>{{{content}}}</svg><div></div>');
    render(template, state);

    function assertNamespaces(callback: (svg: SimpleElement) => void) {
      if (assertNodeTagName(context.root.firstChild, 'svg')) {
        assert.equal(context.root.firstChild.namespaceURI, SVG_NAMESPACE);
        callback(context.root.firstChild as SimpleElement);
      }
      if (assertNodeTagName(context.root.lastChild, 'div')) {
        assert.equal(context.root.lastChild.namespaceURI, XHTML_NAMESPACE);
      }
    }

    equalTokens(context.root, `<svg>${content}</svg><div></div>`);
    assertNamespaces(svg => {
      if (assertNodeTagName(svg.firstChild, 'path')) {
        assert.equal(
          svg.firstChild.namespaceURI,
          SVG_NAMESPACE,
          'initial render path has SVG namespace'
        );
      }
    });

    rerender();

    equalTokens(context.root, `<svg>${content}</svg><div></div>`);
    assertNamespaces(svg => {
      if (assertNodeTagName(svg.firstChild, 'path')) {
        assert.equal(svg.firstChild.namespaceURI, SVG_NAMESPACE, 'path has SVG namespace');
      }
    });

    state.content = '<foreignObject><span></span></foreignObject>';
    rerender();

    equalTokens(context.root, `<svg>${state.content}</svg><div></div>`);
    assertNamespaces(svg => {
      if (assertNodeTagName(svg.firstChild, 'foreignObject')) {
        assert.equal(
          svg.firstChild.namespaceURI,
          SVG_NAMESPACE,
          'initial render path has SVG namespace'
        );
        if (assertNodeTagName(svg.firstChild.firstChild, 'span')) {
          assert.equal(
            svg.firstChild.firstChild.namespaceURI,
            XHTML_NAMESPACE,
            'span has XHTML NS'
          );
        }
      }
    });

    state.content = '<path></path><circle></circle>';
    rerender();

    equalTokens(context.root, `<svg>${state.content}</svg><div></div>`);
    assertNamespaces(svg => {
      if (assertNodeTagName(svg.firstChild, 'path')) {
        assert.equal(
          svg.firstChild.namespaceURI,
          SVG_NAMESPACE,
          'initial render path has SVG namespace'
        );
      }
      if (assertNodeTagName(svg.lastChild, 'circle')) {
        assert.equal(
          svg.lastChild.namespaceURI,
          SVG_NAMESPACE,
          'initial render path has SVG namespace'
        );
      }
    });

    rerender({ content });

    equalTokens(context.root, `<svg>${content}</svg><div></div>`);
    assertNamespaces(svg => {
      if (assertNodeTagName(svg.firstChild, 'path')) {
        assert.equal(
          svg.firstChild.namespaceURI,
          SVG_NAMESPACE,
          'initial render path has SVG namespace'
        );
      }
    });
  });

  test('expression nested inside a namespace', assert => {
    let content = 'Milly';
    let state = { content };
    let template = compile('<div><svg>{{content}}</svg></div>');
    render(template, state);

    function assertNamespaces() {
      if (assertNodeTagName(context.root.firstChild, 'div')) {
        assert.equal(context.root.firstChild.namespaceURI, XHTML_NAMESPACE);
        if (assertNodeTagName(context.root.firstChild.firstChild, 'svg')) {
          assert.equal(context.root.firstChild.firstChild.namespaceURI, SVG_NAMESPACE);
        }
      }
    }

    equalTokens(context.root, `<div><svg>${content}</svg></div>`);
    assertNamespaces();

    rerender();

    equalTokens(context.root, `<div><svg>${content}</svg></div>`);
    assertNamespaces();

    state.content = 'Moe';
    rerender();

    equalTokens(context.root, `<div><svg>${state.content}</svg></div>`);
    assertNamespaces();

    rerender({ content });

    equalTokens(context.root, `<div><svg>${content}</svg></div>`);
    assertNamespaces();
  });

  test('expression nested inside a namespaced context.root element', assert => {
    let content = 'Maurice';
    let state: { content: string | null } = { content };
    let template = compile('<svg>{{content}}</svg>');
    render(template, state);

    function assertSvg(callback?: (svg: SVGSVGElement) => void) {
      if (assertNodeTagName(context.root.firstChild, 'svg')) {
        assert.equal(context.root.firstChild.namespaceURI, SVG_NAMESPACE);
        if (callback) callback(context.root.firstChild);
      }
    }

    equalTokens(context.root, `<svg>${content}</svg>`);
    assertSvg();

    rerender();

    equalTokens(context.root, `<svg>${content}</svg>`);
    assertSvg();

    state.content = null;
    rerender();

    assertSvg(svg => {
      assert.strictEqual(svg.firstChild && svg.firstChild.textContent, '');
    });

    rerender({ content });

    equalTokens(context.root, `<svg>${content}</svg>`);
    assertSvg();
  });

  test('HTML namespace is created in child templates', assert => {
    let isTrue = true;
    let state = { isTrue };
    let template = compile('{{#if isTrue}}<svg></svg>{{else}}<div><svg></svg></div>{{/if}}');
    render(template, state);
    function assertNamespaces(isTrue: boolean) {
      if (isTrue) {
        if (assertNodeTagName(context.root.firstChild, 'svg')) {
          assert.equal(context.root.firstChild.namespaceURI, SVG_NAMESPACE);
        }
      } else {
        if (assertNodeTagName(context.root.firstChild, 'div')) {
          assert.equal(context.root.firstChild.namespaceURI, XHTML_NAMESPACE);
          if (assertNodeTagName(context.root.firstChild.firstChild, 'svg')) {
            assert.equal(context.root.firstChild.firstChild.namespaceURI, SVG_NAMESPACE);
          }
        }
      }
    }

    equalTokens(context.root, `<svg></svg>`);
    assertNamespaces(true);

    rerender();

    equalTokens(context.root, `<svg></svg>`);
    assertNamespaces(true);

    state.isTrue = false;
    rerender();

    equalTokens(context.root, `<div><svg></svg></div>`);
    assertNamespaces(false);

    rerender({ isTrue });

    equalTokens(context.root, `<svg></svg>`);
    assertNamespaces(true);
  });

  test('HTML namespace is continued to child templates', assert => {
    let isTrue = true;
    let state = { isTrue };
    let template = compile('<div><svg>{{#if isTrue}}<circle />{{/if}}</svg></div>');
    render(template, state);

    function assertNamespaces(isTrue: boolean) {
      if (assertNodeTagName(context.root.firstChild, 'div')) {
        assert.equal(context.root.firstChild.namespaceURI, XHTML_NAMESPACE);
        if (assertNodeTagName(context.root.firstChild.firstChild, 'svg')) {
          assert.equal(context.root.firstChild.firstChild.namespaceURI, SVG_NAMESPACE);
          if (
            isTrue &&
            assertNodeTagName(context.root.firstChild.firstChild.firstChild, 'circle')
          ) {
            assert.equal(context.root.firstChild.firstChild.firstChild.namespaceURI, SVG_NAMESPACE);
          }
        }
      }
    }

    equalTokens(context.root, `<div><svg><circle /></svg></div>`);

    assertNamespaces(true);

    rerender();

    equalTokens(context.root, `<div><svg><circle /></svg></div>`);
    assertNamespaces(true);

    state.isTrue = false;
    rerender();

    equalTokens(context.root, `<div><svg><!----></svg></div>`);
    assertNamespaces(false);

    rerender({ isTrue });

    equalTokens(context.root, `<div><svg><circle /></svg></div>`);
    assertNamespaces(true);
  });
});

QUnit.module('Updating Element Modifiers', hooks => {
  hooks.beforeEach(() => commonSetup());

  test('Updating a element modifier', assert => {
    let { manager } = registerModifier(context.registry, 'foo');

    let template = compile('<div><div {{foo bar baz=fizz}}></div></div>');
    let input = {
      bar: 'Super Metroid',
    };

    render(template, input);

    let valueNode: Node | null | undefined;
    if (assertNodeTagName(context.root.firstChild, 'div')) {
      valueNode = context.root.firstChild.firstChild;
    }

    equalTokens(
      context.root,
      '<div><div data-modifier="installed - Super Metroid"></div></div>',
      'initial render'
    );
    assert.equal(manager.installedElements.length, 1);
    assert.equal(valueNode, manager.installedElements[0]);
    assert.equal(manager.updatedElements.length, 0);
    assert.equal(manager.destroyedModifiers.length, 0);

    rerender();

    equalTokens(
      context.root,
      '<div><div data-modifier="updated - Super Metroid"></div></div>',
      'modifier updated'
    );
    assert.equal(manager.installedElements.length, 1);
    assert.equal(valueNode, manager.installedElements[0]);
    assert.equal(manager.updatedElements.length, 1);
    assert.equal(valueNode, manager.updatedElements[0]);
    assert.equal(manager.destroyedModifiers.length, 0);

    input.bar = 'Super Mario';

    rerender();

    equalTokens(
      context.root,
      '<div><div data-modifier="updated - Super Mario"></div></div>',
      'no change'
    );
    assert.equal(manager.installedElements.length, 1);
    assert.equal(valueNode, manager.installedElements[0]);
    assert.equal(manager.updatedElements.length, 2);
    assert.equal(valueNode, manager.updatedElements[1]);
    assert.equal(manager.destroyedModifiers.length, 0);
  });

  test("Const input doesn't trigger update in a element modifier", assert => {
    let { manager } = registerModifier(context.registry, 'foo');

    let template = compile('<div><div {{foo "bar"}}></div></div>');
    let input = {};

    render(template, input);

    let valueNode: Node | null | undefined;
    if (assertNodeTagName(context.root.firstChild, 'div')) {
      valueNode = context.root.firstChild.firstChild;
    }

    equalTokens(
      context.root,
      '<div><div data-modifier="installed - bar"></div></div>',
      'initial render'
    );
    assert.equal(manager.installedElements.length, 1);
    assert.equal(valueNode, manager.installedElements[0]);
    assert.equal(manager.updatedElements.length, 0);
    assert.equal(manager.destroyedModifiers.length, 0);

    rerender();

    equalTokens(
      context.root,
      '<div><div data-modifier="installed - bar"></div></div>',
      'no change'
    );
    assert.equal(manager.installedElements.length, 1);
    assert.equal(valueNode, manager.installedElements[0]);
    assert.equal(manager.updatedElements.length, 0);
    assert.equal(manager.destroyedModifiers.length, 0);
  });

  test('Destructor is triggered on element modifiers', assert => {
    let { manager } = registerModifier(context.registry, 'foo');

    let template = compile('{{#if bar}}<div {{foo bar}}></div>{{else}}<div></div>{{/if}}');
    let input = {
      bar: true,
    };

    render(template, input);

    let valueNode = context.root.firstChild;

    equalTokens(context.root, '<div data-modifier="installed - true"></div>', 'initial render');
    assert.equal(manager.installedElements.length, 1);
    assert.equal(valueNode, manager.installedElements[0]);
    assert.equal(manager.updatedElements.length, 0);
    assert.equal(manager.destroyedModifiers.length, 0);

    rerender();

    equalTokens(context.root, '<div data-modifier="updated - true"></div>', 'modifier updated');
    assert.equal(manager.installedElements.length, 1);
    assert.equal(valueNode, manager.installedElements[0]);
    assert.equal(manager.updatedElements.length, 1);
    assert.equal(manager.destroyedModifiers.length, 0);

    input.bar = false;
    rerender();

    equalTokens(context.root, '<div></div>', 'no more modifier');
    assert.equal(manager.destroyedModifiers.length, 1);

    input.bar = true;
    rerender();

    equalTokens(
      context.root,
      '<div data-modifier="installed - true"></div>',
      'back to default render'
    );
    assert.equal(manager.installedElements.length, 2);
    assert.equal(manager.destroyedModifiers.length, 1);
  });
});
