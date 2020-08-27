import { SafeString } from '@glimmer/runtime';
import { RenderTest, jitSuite, RenderTestConstructor } from '..';
import { SimpleElement, SimpleNode, Namespace } from '@simple-dom/interface';
import RenderDelegate from '../lib/render-delegate';

const SVG_NAMESPACE = Namespace.SVG;

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

class ContentTest extends RenderTest {
  static suiteName = 'Updating - Content';

  makeElement(tag: string, content: string): SimpleElement {
    let el = this.delegate.createElement(tag);
    el.appendChild(this.delegate.createTextNode(content));
    return el;
  }

  makeSVGElement(tag: string, content: string): SimpleElement {
    let el = this.delegate.createElementNS(SVG_NAMESPACE, tag);
    el.appendChild(this.delegate.createTextNode(content));
    return el;
  }

  makeFragment(nodes: SimpleNode[]) {
    let frag = this.delegate.createDocumentFragment();
    nodes.forEach((node) => frag.appendChild(node));
    return frag;
  }
}

// Test cases to matrix:
// const helper returns const SafeString
// non-const
// safe string
// unsafe string
// swapping between safe and unsafe
// swapping between unsafe and safe

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
    input:
      | ContentValue
      | ((context: ContentTest, isHTML: boolean) => ContentValue)
      | { toString(): string };
    expected: string | ((context: ContentTest, isHTML: boolean) => string);
    description: string;
  }>;
}

function generateContentTestCase(
  suite: RenderTestConstructor<RenderDelegate, RenderTest>,
  tc: ContentTestCase
): void {
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
  ].forEach((wrapper) => {
    let test = function (this: ContentTest) {
      let template = wrapper.before + tc.template + wrapper.after;
      tc.values.forEach(({ input: _input, expected: _expected, description }, index) => {
        let input: unknown;
        let expected: string;

        if (typeof _input === 'function') {
          input = _input(this, wrapper.isHTML);
        } else {
          input = _input;
        }

        if (typeof _expected === 'function') {
          expected = _expected(this, wrapper.isHTML);
        } else {
          expected = _expected;
        }

        if (index === 0) {
          this.render(template, { value: input });
          this.assertHTML(
            wrapper.before + expected + wrapper.after,
            `expected initial render (${description})`
          );
        } else {
          this.rerender({ value: input });
          this.assertHTML(
            wrapper.before + expected + wrapper.after,
            `expected updated render (${description})`
          );
        }
      });
    };

    (test as any).isTest = true;
    (suite as any).prototype[
      `updating ${tc.name} produces expected result in ${wrapper.name}`
    ] = test;
  });
}

generateContentTestCase(ContentTest, {
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
      input: (_test, isHTML) => makeSafeString(isHTML ? '<b>hello</b>' : '<text>hello</text>'),
      expected: (_test, isHTML) => (isHTML ? '<b>hello</b>' : '<text>hello</text>'),
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
      input: (test, isHTML) =>
        isHTML ? test.makeElement('p', 'hello') : test.makeSVGElement('text', 'hello'),
      expected: (_test, isHTML) => (isHTML ? '<p>hello</p>' : '<text>hello</text>'),
      description: 'DOM node containing an element with text',
    },
    {
      input: (test, isHTML) => {
        if (isHTML) {
          return test.makeFragment([test.makeElement('p', 'one'), test.makeElement('p', 'two')]);
        } else {
          return test.makeFragment([
            test.makeSVGElement('text', 'one'),
            test.makeSVGElement('text', 'two'),
          ]);
        }
      },
      expected: (_test, isHTML) =>
        isHTML ? '<p>one</p><p>two</p>' : '<text>one</text><text>two</text>',
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

generateContentTestCase(ContentTest, {
  name: 'triple curlies',
  template: '{{{this.value}}}',
  values: [
    {
      input: 'hello',
      expected: 'hello',
      description: 'plain string',
    },
    {
      input: (_test, isHTML) => (isHTML ? '<b>hello</b>' : '<text>hello</text>'),
      expected: (_test, isHTML) => (isHTML ? '<b>hello</b>' : '<text>hello</text>'),
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
      input: (_test, isHTML) => makeSafeString(isHTML ? '<b>hello</b>' : '<text>hello</text>'),
      expected: (_test, isHTML) => (isHTML ? '<b>hello</b>' : '<text>hello</text>'),
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
      input: (test, isHTML) =>
        isHTML ? test.makeElement('p', 'hello') : test.makeSVGElement('text', 'hello'),
      expected: (_test, isHTML) => (isHTML ? '<p>hello</p>' : '<text>hello</text>'),
      description: 'DOM node containing an element with text',
    },
    {
      input: (test, isHTML) => {
        if (isHTML) {
          return test.makeFragment([test.makeElement('p', 'one'), test.makeElement('p', 'two')]);
        } else {
          return test.makeFragment([
            test.makeSVGElement('text', 'one'),
            test.makeSVGElement('text', 'two'),
          ]);
        }
      },
      expected: (_test, isHTML) =>
        isHTML ? '<p>one</p><p>two</p>' : '<text>one</text><text>two</text>',
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

jitSuite(ContentTest);
