import type { SimpleElement } from '@glimmer/interfaces';
import { castToBrowser, checkNode, unwrap } from '@glimmer/debug-util';
import { NS_SVG, strip } from '@glimmer/util';

import { assertNodeTagName } from '../dom/assertions';
import { firstElementChild, getElementsByTagName } from '../dom/simple-utils';
import { RenderTest } from '../render-test';
import { test } from '../test-decorator';

export class InitialRenderSuite extends RenderTest {
  static suiteName = 'initial render';

  name = 'BASE';
  @test
  'HTML text content'() {
    this.render('content');
    this.assertHTML('content');
    this.assertStableRerender();
  }

  @test
  'HTML tags'() {
    this.render('<h1>hello!</h1><div>content</div>');
    this.assertHTML('<h1>hello!</h1><div>content</div>');
    this.assertStableRerender();
  }

  @test
  'HTML attributes'() {
    this.render("<div class='foo' id='bar'>content</div>");
    this.assertHTML("<div class='foo' id='bar'>content</div>");
    this.assertStableRerender();
  }

  @test
  'HTML data attributes'() {
    this.render("<div data-some-data='foo'>content</div>");
    this.assertHTML("<div data-some-data='foo'>content</div>");
    this.assertStableRerender();
  }

  @test
  'HTML checked attributes'() {
    this.render("<input checked='checked'>");
    this.assertHTML(`<input checked='checked'>`);
    this.assertStableRerender();
  }

  @test
  'HTML selected options'() {
    this.render(strip`
      <select>
        <option>1</option>
        <option selected>2</option>
        <option>3</option>
      </select>
    `);
    this.assertHTML(strip`
      <select>
        <option>1</option>
        <option selected>2</option>
        <option>3</option>
      </select>
    `);
    this.assertStableRerender();
  }

  @test
  'HTML multi-select options'() {
    this.render(strip`
      <select multiple>
        <option>1</option>
        <option selected>2</option>
        <option selected>3</option>
      </select>
    `);
    this.assertHTML(strip`
      <select multiple>
        <option>1</option>
        <option selected>2</option>
        <option selected>3</option>
      </select>
    `);
    this.assertStableRerender();
  }

  @test
  'Void Elements'() {
    const voidElements = 'area base br embed hr img input keygen link meta param source track wbr';
    voidElements.split(' ').forEach((tagName) => this.shouldBeVoid(tagName));
  }

  @test
  'Nested HTML'() {
    this.render(
      "<div class='foo'><p><span id='bar' data-foo='bar'>hi!</span></p></div>&nbsp;More content"
    );
    this.assertHTML(
      "<div class='foo'><p><span id='bar' data-foo='bar'>hi!</span></p></div>&nbsp;More content"
    );
    this.assertStableRerender();
  }

  @test
  'Custom Elements'() {
    this.render('<use-the-platform></use-the-platform>');
    this.assertHTML('<use-the-platform></use-the-platform>');
    this.assertStableRerender();
  }

  @test
  'Nested Custom Elements'() {
    this.render(
      "<use-the-platform><seriously-please data-foo='1'>Stuff <div>Here</div></seriously-please></use-the-platform>"
    );
    this.assertHTML(
      "<use-the-platform><seriously-please data-foo='1'>Stuff <div>Here</div></seriously-please></use-the-platform>"
    );
    this.assertStableRerender();
  }

  @test
  'Moar nested Custom Elements'() {
    this.render(
      "<use-the-platform><seriously-please data-foo='1'><wheres-the-platform>Here</wheres-the-platform></seriously-please></use-the-platform>"
    );
    this.assertHTML(
      "<use-the-platform><seriously-please data-foo='1'><wheres-the-platform>Here</wheres-the-platform></seriously-please></use-the-platform>"
    );
    this.assertStableRerender();
  }

  @test
  'Custom Elements with dynamic attributes'() {
    this.render(
      "<fake-thing><other-fake-thing data-src='extra-{{this.someDynamicBits}}-here' /></fake-thing>",
      { someDynamicBits: 'things' }
    );
    this.assertHTML("<fake-thing><other-fake-thing data-src='extra-things-here' /></fake-thing>");
    this.assertStableRerender();
  }

  @test
  'Custom Elements with dynamic content'() {
    this.render('<x-foo><x-bar>{{this.derp}}</x-bar></x-foo>', { derp: 'stuff' });
    this.assertHTML('<x-foo><x-bar>stuff</x-bar></x-foo>');
    this.assertStableRerender();
  }

  @test
  'Dynamic content within single custom element'() {
    this.render('<x-foo>{{#if this.derp}}Content Here{{/if}}</x-foo>', { derp: 'stuff' });
    this.assertHTML('<x-foo>Content Here</x-foo>');
    this.assertStableRerender();

    this.rerender({ derp: false });
    this.assertHTML('<x-foo><!----></x-foo>');
    this.assertStableRerender();

    this.rerender({ derp: true });
    this.assertHTML('<x-foo>Content Here</x-foo>');
    this.assertStableRerender();

    this.rerender({ derp: 'stuff' });
    this.assertHTML('<x-foo>Content Here</x-foo>');
    this.assertStableRerender();
  }

  @test
  'Supports quotes'() {
    this.render('<div>"This is a title," we\'re on a boat</div>');
    this.assertHTML('<div>"This is a title," we\'re on a boat</div>');
    this.assertStableRerender();
  }

  @test
  'Supports backslashes'() {
    this.render('<div>This is a backslash: \\</div>');
    this.assertHTML('<div>This is a backslash: \\</div>');
    this.assertStableRerender();
  }

  @test
  'Supports new lines'() {
    this.render('<div>common\n\nbro</div>');
    this.assertHTML('<div>common\n\nbro</div>');
    this.assertStableRerender();
  }

  @test
  'HTML tag with empty attribute'() {
    this.render("<div class=''>content</div>");
    this.assertHTML("<div class=''>content</div>");
    this.assertStableRerender();
  }

  @test
  'Attributes containing a helper are treated like a block'() {
    this.registerHelper('testing', (params) => {
      this.assert.deepEqual(params, [123]);
      return 'example.com';
    });

    this.render('<a href="http://{{testing 123}}/index.html">linky</a>');
    this.assertHTML('<a href="http://example.com/index.html">linky</a>');
    this.assertStableRerender();
  }

  @test
  "HTML boolean attribute 'disabled'"() {
    this.render('<input disabled>');
    this.assertHTML('<input disabled>');

    // TODO: What is the point of this test? (Note that it wouldn't work with SimpleDOM)
    // assertNodeProperty(root.firstChild, 'input', 'disabled', true);

    this.assertStableRerender();
  }

  @test
  'Quoted attribute null values do not disable'() {
    this.render('<input disabled="{{this.isDisabled}}">', { isDisabled: null });
    this.assertHTML('<input>');
    this.assertStableRerender();

    // TODO: What is the point of this test? (Note that it wouldn't work with SimpleDOM)
    // assertNodeProperty(root.firstChild, 'input', 'disabled', false);

    this.rerender({ isDisabled: true });
    this.assertHTML('<input disabled>');
    this.assertStableNodes();

    // TODO: ??????????
    this.rerender({ isDisabled: false });
    this.assertHTML('<input disabled>');
    this.assertStableNodes();

    this.rerender({ isDisabled: null });
    this.assertHTML('<input>');
    this.assertStableNodes();
  }

  @test
  'Unquoted attribute null values do not disable'() {
    this.render('<input disabled={{this.isDisabled}}>', { isDisabled: null });
    this.assertHTML('<input>');
    this.assertStableRerender();

    // TODO: What is the point of this test? (Note that it wouldn't work with SimpleDOM)
    // assertNodeProperty(root.firstChild, 'input', 'disabled', false);

    this.rerender({ isDisabled: true });
    this.assertHTML('<input disabled>');
    this.assertStableRerender();

    this.rerender({ isDisabled: false });
    this.assertHTML('<input>');
    this.assertStableRerender();

    this.rerender({ isDisabled: null });
    this.assertHTML('<input>');
    this.assertStableRerender();
  }

  @test
  'Quoted attribute string values'() {
    this.render("<img src='{{this.src}}'>", { src: 'image.png' });
    this.assertHTML("<img src='image.png'>");
    this.assertStableRerender();

    this.rerender({ src: 'newimage.png' });
    this.assertHTML("<img src='newimage.png'>");
    this.assertStableNodes();

    this.rerender({ src: '' });
    this.assertHTML("<img src=''>");
    this.assertStableNodes();

    this.rerender({ src: 'image.png' });
    this.assertHTML("<img src='image.png'>");
    this.assertStableNodes();
  }

  @test
  'Unquoted attribute string values'() {
    this.render('<img src={{this.src}}>', { src: 'image.png' });
    this.assertHTML("<img src='image.png'>");
    this.assertStableRerender();

    this.rerender({ src: 'newimage.png' });
    this.assertHTML("<img src='newimage.png'>");
    this.assertStableNodes();

    this.rerender({ src: '' });
    this.assertHTML("<img src=''>");
    this.assertStableNodes();

    this.rerender({ src: 'image.png' });
    this.assertHTML("<img src='image.png'>");
    this.assertStableNodes();
  }

  @test
  'Unquoted img src attribute is not rendered when set to `null`'() {
    this.render("<img src='{{this.src}}'>", { src: null });
    this.assertHTML('<img>');
    this.assertStableRerender();

    this.rerender({ src: 'newimage.png' });
    this.assertHTML("<img src='newimage.png'>");
    this.assertStableNodes();

    this.rerender({ src: '' });
    this.assertHTML("<img src=''>");
    this.assertStableNodes();

    this.rerender({ src: null });
    this.assertHTML('<img>');
    this.assertStableNodes();
  }

  @test
  'Unquoted img src attribute is not rendered when set to `undefined`'() {
    this.render("<img src='{{this.src}}'>", { src: undefined });
    this.assertHTML('<img>');
    this.assertStableRerender();

    this.rerender({ src: 'newimage.png' });
    this.assertHTML("<img src='newimage.png'>");
    this.assertStableNodes();

    this.rerender({ src: '' });
    this.assertHTML("<img src=''>");
    this.assertStableNodes();

    this.rerender({ src: undefined });
    this.assertHTML('<img>');
    this.assertStableNodes();
  }

  @test
  'Unquoted a href attribute is not rendered when set to `null`'() {
    this.render('<a href={{this.href}}></a>', { href: null });
    this.assertHTML('<a></a>');
    this.assertStableRerender();

    this.rerender({ href: 'http://example.com' });
    this.assertHTML("<a href='http://example.com'></a>");
    this.assertStableNodes();

    this.rerender({ href: '' });
    this.assertHTML("<a href=''></a>");
    this.assertStableNodes();

    this.rerender({ href: null });
    this.assertHTML('<a></a>');
    this.assertStableNodes();
  }

  @test
  'Unquoted a href attribute is not rendered when set to `undefined`'() {
    this.render('<a href={{this.href}}></a>', { href: undefined });
    this.assertHTML('<a></a>');
    this.assertStableRerender();

    this.rerender({ href: 'http://example.com' });
    this.assertHTML("<a href='http://example.com'></a>");
    this.assertStableNodes();

    this.rerender({ href: '' });
    this.assertHTML("<a href=''></a>");
    this.assertStableNodes();

    this.rerender({ href: undefined });
    this.assertHTML('<a></a>');
    this.assertStableNodes();
  }

  @test
  'Attribute expression can be followed by another attribute'() {
    this.render("<div foo='{{this.funstuff}}' name='Alice'></div>", { funstuff: 'oh my' });
    this.assertHTML("<div name='Alice' foo='oh my'></div>");
    this.assertStableRerender();

    this.rerender({ funstuff: 'oh boy' });
    this.assertHTML("<div name='Alice' foo='oh boy'></div>");
    this.assertStableNodes();

    this.rerender({ funstuff: '' });
    this.assertHTML("<div name='Alice' foo=''></div>");
    this.assertStableNodes();

    this.rerender({ funstuff: 'oh my' });
    this.assertHTML("<div name='Alice' foo='oh my'></div>");
    this.assertStableNodes();
  }

  @test
  'Dynamic selected options'() {
    this.render(
      strip`
      <select>
        <option>1</option>
        <option selected={{this.selected}}>2</option>
        <option>3</option>
      </select>
    `,
      { selected: true }
    );

    this.assertHTML(strip`
      <select>
        <option>1</option>
        <option ${this.name === 'rehydration' ? ' selected=true' : ''}>2</option>
        <option>3</option>
      </select>
    `);

    let selectNode = checkNode(castToBrowser(this.element, 'HTML').firstElementChild, 'select');
    this.assert.strictEqual(selectNode.selectedIndex, 1);
    this.assertStableRerender();

    this.rerender({ selected: false });
    this.assertHTML(strip`
      <select>
        <option>1</option>
        <option ${this.name === 'rehydration' ? ' selected=true' : ''}>2</option>
        <option>3</option>
      </select>
    `);

    selectNode = checkNode(castToBrowser(this.element, 'HTML').firstElementChild, 'select');

    this.assert.strictEqual(selectNode.selectedIndex, 0);

    this.assertStableNodes();

    this.rerender({ selected: '' });

    this.assertHTML(strip`
      <select>
        <option>1</option>
        <option ${this.name === 'rehydration' ? ' selected=true' : ''}>2</option>
        <option>3</option>
      </select>
    `);

    selectNode = checkNode(castToBrowser(this.element, 'HTML').firstElementChild, 'select');

    this.assert.strictEqual(selectNode.selectedIndex, 0);

    this.assertStableNodes();

    this.rerender({ selected: true });
    this.assertHTML(strip`
      <select>
        <option>1</option>
        <option ${this.name === 'rehydration' ? ' selected=true' : ''}>2</option>
        <option>3</option>
      </select>
    `);

    selectNode = checkNode(castToBrowser(this.element, 'HTML').firstElementChild, 'select');
    this.assert.strictEqual(selectNode.selectedIndex, 1);
    this.assertStableNodes();
  }

  @test
  'Dynamic multi-select'() {
    this.render(
      strip`
      <select multiple>
        <option>0</option>
        <option selected={{this.somethingTrue}}>1</option>
        <option selected={{this.somethingTruthy}}>2</option>
        <option selected={{this.somethingUndefined}}>3</option>
        <option selected={{this.somethingNull}}>4</option>
        <option selected={{this.somethingFalse}}>5</option>
      </select>`,
      {
        somethingTrue: true,
        somethingTruthy: 'is-true',
        somethingUndefined: undefined,
        somethingNull: null,
        somethingFalse: false,
      }
    );

    const selectNode = firstElementChild(this.element);
    this.assert.ok(selectNode, 'rendered select');
    if (selectNode === null) {
      return;
    }
    const options = getElementsByTagName(selectNode, 'option');
    const selected: SimpleElement[] = [];

    for (const option of options) {
      // TODO: This is a real discrepancy with SimpleDOM
      if ((option as any).selected) {
        selected.push(option);
      }
    }

    const [first, second] = this.guardArray({ selected }, { min: 2 });

    this.assertHTML(strip`
      <select multiple="">
        <option>0</option>
        <option ${this.name === 'rehydration' ? ' selected=true' : ''}>1</option>
        <option ${this.name === 'rehydration' ? ' selected=true' : ''}>2</option>
        <option>3</option>
        <option>4</option>
        <option>5</option>
      </select>`);

    this.assert.strictEqual(selected.length, 2, 'two options are selected');
    this.assert.strictEqual(
      castToBrowser(first, 'option').value,
      '1',
      'first selected item is "1"'
    );
    this.assert.strictEqual(
      castToBrowser(second, 'option').value,
      '2',
      'second selected item is "2"'
    );
  }

  @test
  'HTML comments'() {
    this.render('<div><!-- Just passing through --></div>');
    this.assertHTML('<div><!-- Just passing through --></div>');
    this.assertStableRerender();
  }

  @test
  'Curlies in HTML comments'() {
    this.render('<div><!-- {{this.foo}} --></div>', { foo: 'foo' });
    this.assertHTML('<div><!-- {{this.foo}} --></div>');
    this.assertStableRerender();

    this.rerender({ foo: 'bar' });
    this.assertHTML('<div><!-- {{this.foo}} --></div>');
    this.assertStableNodes();

    this.rerender({ foo: '' });
    this.assertHTML('<div><!-- {{this.foo}} --></div>');
    this.assertStableNodes();

    this.rerender({ foo: 'foo' });
    this.assertHTML('<div><!-- {{this.foo}} --></div>');
    this.assertStableNodes();
  }

  @test
  'Complex Curlies in HTML comments'() {
    this.render('<div><!-- {{this.foo bar baz}} --></div>', { foo: 'foo' });
    this.assertHTML('<div><!-- {{this.foo bar baz}} --></div>');
    this.assertStableRerender();

    this.rerender({ foo: 'bar' });
    this.assertHTML('<div><!-- {{this.foo bar baz}} --></div>');
    this.assertStableNodes();

    this.rerender({ foo: '' });
    this.assertHTML('<div><!-- {{this.foo bar baz}} --></div>');
    this.assertStableNodes();

    this.rerender({ foo: 'foo' });
    this.assertHTML('<div><!-- {{this.foo bar baz}} --></div>');
    this.assertStableNodes();
  }

  @test
  'HTML comments with multi-line mustaches'() {
    this.render('<div><!-- {{#each foo as |bar|}}\n{{bar}}\n\n{{/each}} --></div>');
    this.assertHTML('<div><!-- {{#each foo as |bar|}}\n{{bar}}\n\n{{/each}} --></div>');
    this.assertStableRerender();
  }

  @test
  'Top level comments'() {
    this.render('<!-- {{this.foo}} -->');
    this.assertHTML('<!-- {{this.foo}} -->');
    this.assertStableRerender();
  }

  @test
  'Handlebars comments'() {
    this.render('<div>{{! Better not break! }}content</div>');
    this.assertHTML('<div>content</div>');
    this.assertStableRerender();
  }

  @test
  'Namespaced attribute'() {
    this.render("<svg xlink:title='svg-title'>content</svg>");
    this.assertHTML("<svg xlink:title='svg-title'>content</svg>");
    this.assertStableRerender();
  }

  @test
  'svg href attribute with quotation marks'() {
    this.render(
      `<svg xmlns:xlink="http://www.w3.org/1999/xlink"><use xlink:href="{{this.iconLink}}"></use></svg>`,
      { iconLink: 'home' }
    );
    this.assertHTML(
      `<svg xmlns:xlink="http://www.w3.org/1999/xlink"><use xlink:href="home"></use></svg>`
    );
    const svg = this.element.firstChild;
    if (assertNodeTagName(svg, 'svg')) {
      const use = svg.firstChild;
      if (assertNodeTagName(use, 'use')) {
        this.assert.strictEqual(use.href.baseVal, 'home');
      }
    }
  }

  @test
  'svg href attribute without quotation marks'() {
    this.render(
      `<svg xmlns:xlink="http://www.w3.org/1999/xlink"><use xlink:href={{this.iconLink}}></use></svg>`,
      { iconLink: 'home' }
    );
    this.assertHTML(
      `<svg xmlns:xlink="http://www.w3.org/1999/xlink"><use xlink:href="home"></use></svg>`
    );
    const svg = this.element.firstChild;
    if (assertNodeTagName(svg, 'svg')) {
      const use = svg.firstChild;
      if (assertNodeTagName(use, 'use')) {
        this.assert.strictEqual(use.href.baseVal, 'home');
      }
    }
  }

  @test
  '<svg> tag with case-sensitive attribute'() {
    this.render('<svg viewBox="0 0 0 0"></svg>');
    this.assertHTML('<svg viewBox="0 0 0 0"></svg>');
    const svg = this.element.firstChild;
    if (assertNodeTagName(svg, 'svg')) {
      this.assert.strictEqual(svg.namespaceURI, NS_SVG);
      this.assert.strictEqual(svg.getAttribute('viewBox'), '0 0 0 0');
    }
    this.assertStableRerender();
  }

  @test
  'nested element in the SVG namespace'() {
    const d = 'M 0 0 L 100 100';
    this.render(`<svg><path d="${d}"></path></svg>`);
    this.assertHTML(`<svg><path d="${d}"></path></svg>`);

    const svg = this.element.firstChild;

    if (assertNodeTagName(svg, 'svg')) {
      this.assert.strictEqual(svg.namespaceURI, NS_SVG);

      const path = svg.firstChild;
      if (assertNodeTagName(path, 'path')) {
        this.assert.strictEqual(
          path.namespaceURI,
          NS_SVG,
          'creates the path element with a namespace'
        );
        this.assert.strictEqual(path.getAttribute('d'), d);
      }
    }

    this.assertStableRerender();
  }

  @test
  '<foreignObject> tag has an SVG namespace'() {
    this.render('<svg><foreignObject>Hi</foreignObject></svg>');
    this.assertHTML('<svg><foreignObject>Hi</foreignObject></svg>');

    const svg = this.element.firstChild;

    if (assertNodeTagName(svg, 'svg')) {
      this.assert.strictEqual(svg.namespaceURI, NS_SVG);

      const foreignObject = svg.firstChild;

      if (assertNodeTagName(foreignObject, 'foreignObject')) {
        this.assert.strictEqual(
          foreignObject.namespaceURI,
          NS_SVG,
          'creates the foreignObject element with a namespace'
        );
      }
    }

    this.assertStableRerender();
  }

  @test
  'Namespaced and non-namespaced elements as siblings'() {
    this.render('<svg></svg><svg></svg><div></div>');
    this.assertHTML('<svg></svg><svg></svg><div></div>');

    const [firstChild, secondChild, thirdChild] = this.guardArray(
      { childNodes: this.element.childNodes },
      { min: 3 }
    );

    this.assert.strictEqual(
      castToBrowser(unwrap(firstChild), 'SVG').namespaceURI,
      NS_SVG,
      'creates the first svg element with a namespace'
    );

    this.assert.strictEqual(
      castToBrowser(secondChild, 'SVG').namespaceURI,
      NS_SVG,
      'creates the second svg element with a namespace'
    );

    this.assert.strictEqual(
      castToBrowser(thirdChild, 'HTML').namespaceURI,
      XHTML_NAMESPACE,
      'creates the div element without a namespace'
    );

    this.assertStableRerender();
  }

  @test
  'Namespaced and non-namespaced elements with nesting'() {
    this.render('<div><svg></svg></div><div></div>');

    const firstDiv = this.element.firstChild;
    const secondDiv = this.element.lastChild;
    const svg = firstDiv && firstDiv.firstChild;

    this.assertHTML('<div><svg></svg></div><div></div>');

    if (assertNodeTagName(firstDiv, 'div')) {
      this.assert.strictEqual(
        firstDiv.namespaceURI,
        XHTML_NAMESPACE,
        "first div's namespace is xhtmlNamespace"
      );
    }

    if (assertNodeTagName(svg, 'svg')) {
      this.assert.strictEqual(svg.namespaceURI, NS_SVG, "svg's namespace is svgNamespace");
    }

    if (assertNodeTagName(secondDiv, 'div')) {
      this.assert.strictEqual(
        secondDiv.namespaceURI,
        XHTML_NAMESPACE,
        "last div's namespace is xhtmlNamespace"
      );
    }

    this.assertStableRerender();
  }

  @test
  'Case-sensitive tag has capitalization preserved'() {
    this.render('<svg><linearGradient id="gradient"></linearGradient></svg>');
    this.assertHTML('<svg><linearGradient id="gradient"></linearGradient></svg>');
    this.assertStableRerender();
  }

  @test
  'Text curlies'() {
    this.render('<div>{{this.title}}<span>{{this.title}}</span></div>', { title: 'hello' });
    this.assertHTML('<div>hello<span>hello</span></div>');
    this.assertStableRerender();

    this.rerender({ title: 'goodbye' });
    this.assertHTML('<div>goodbye<span>goodbye</span></div>');
    this.assertStableNodes();

    this.rerender({ title: '' });
    this.assertHTML('<div><span></span></div>');
    this.assertStableNodes();

    this.rerender({ title: 'hello' });
    this.assertHTML('<div>hello<span>hello</span></div>');
    this.assertStableNodes();
  }

  @test
  'Repaired text nodes are ensured in the right place Part 1'() {
    this.render('{{this.a}} {{this.b}}', { a: 'A', b: 'B', c: 'C', d: 'D' });
    this.assertHTML('A B');
    this.assertStableRerender();
  }

  @test
  'Repaired text nodes are ensured in the right place Part 2'() {
    this.render('<div>{{this.a}}{{this.b}}{{this.c}}wat{{this.d}}</div>', {
      a: 'A',
      b: 'B',
      c: 'C',
      d: 'D',
    });
    this.assertHTML('<div>ABCwatD</div>');
    this.assertStableRerender();
  }

  @test
  'Repaired text nodes are ensured in the right place Part 3'() {
    this.render('{{this.a}}{{this.b}}<img><img><img><img>', { a: 'A', b: 'B', c: 'C', d: 'D' });
    this.assertHTML('AB<img><img><img><img>');
    this.assertStableRerender();
  }

  @test
  'Path expressions'() {
    this.render('<div>{{this.model.foo.bar}}<span>{{this.model.foo.bar}}</span></div>', {
      model: { foo: { bar: 'hello' } },
    });
    this.assertHTML('<div>hello<span>hello</span></div>');
    this.assertStableRerender();

    this.rerender({ model: { foo: { bar: 'goodbye' } } });
    this.assertHTML('<div>goodbye<span>goodbye</span></div>');
    this.assertStableNodes();

    this.rerender({ model: { foo: { bar: '' } } });
    this.assertHTML('<div><span></span></div>');
    this.assertStableNodes();

    this.rerender({ model: { foo: { bar: 'hello' } } });
    this.assertHTML('<div>hello<span>hello</span></div>');
    this.assertStableNodes();
  }

  @test
  'Text curlies perform escaping'() {
    this.render('<div>{{this.title}}<span>{{this.title}}</span></div>', {
      title: '<strong>hello</strong>',
    });
    this.assertHTML(
      '<div>&lt;strong&gt;hello&lt;/strong&gt;<span>&lt;strong>hello&lt;/strong&gt;</span></div>'
    );
    this.assertStableRerender();

    this.rerender({ title: '<i>goodbye</i>' });
    this.assertHTML('<div>&lt;i&gt;goodbye&lt;/i&gt;<span>&lt;i&gt;goodbye&lt;/i&gt;</span></div>');
    this.assertStableNodes();

    this.rerender({ title: '' });
    this.assertHTML('<div><span></span></div>');
    this.assertStableNodes();

    this.rerender({ title: '<strong>hello</strong>' });
    this.assertHTML(
      '<div>&lt;strong&gt;hello&lt;/strong&gt;<span>&lt;strong>hello&lt;/strong&gt;</span></div>'
    );
    this.assertStableNodes();
  }

  @test
  'Rerender respects whitespace'() {
    this.render('Hello {{ this.foo }} ', { foo: 'bar' });
    this.assertHTML('Hello bar ');
    this.assertStableRerender();

    this.rerender({ foo: 'baz' });
    this.assertHTML('Hello baz ');
    this.assertStableNodes();

    this.rerender({ foo: '' });
    this.assertHTML('Hello  ');
    this.assertStableNodes();

    this.rerender({ foo: 'bar' });
    this.assertHTML('Hello bar ');
    this.assertStableNodes();
  }

  @test
  'Safe HTML curlies'() {
    const title = {
      toHTML() {
        return '<span>hello</span> <em>world</em>';
      },
    };
    this.render('<div>{{this.title}}</div>', { title });
    this.assertHTML('<div><span>hello</span> <em>world</em></div>');
    this.assertStableRerender();
  }

  @test
  'Triple curlies'() {
    const title = '<span>hello</span> <em>world</em>';
    this.render('<div>{{{this.title}}}</div>', { title });
    this.assertHTML('<div><span>hello</span> <em>world</em></div>');
    this.assertStableRerender();
  }

  @test
  'Triple curlie helpers'() {
    this.registerHelper('unescaped', ([param]) => param);
    this.registerHelper('escaped', ([param]) => param);
    this.render('{{{unescaped "<strong>Yolo</strong>"}}} {{escaped "<strong>Yolo</strong>"}}');
    this.assertHTML('<strong>Yolo</strong> &lt;strong&gt;Yolo&lt;/strong&gt;');
    this.assertStableRerender();
  }

  @test
  'Top level triple curlies'() {
    const title = '<span>hello</span> <em>world</em>';
    this.render('{{{this.title}}}', { title });
    this.assertHTML('<span>hello</span> <em>world</em>');
    this.assertStableRerender();
  }

  @test
  'Top level unescaped tr'() {
    const title = '<tr><td>Yo</td></tr>';
    this.render('<table>{{{this.title}}}</table>', { title });
    this.assertHTML('<table><tbody><tr><td>Yo</td></tr></tbody></table>');
    this.assertStableRerender();
  }

  @test
  'The compiler can handle top-level unescaped td inside tr contextualElement'() {
    this.render('{{{this.html}}}', { html: '<td>Yo</td>' });
    this.assertHTML('<tr><td>Yo</td></tr>');
    this.assertStableRerender();
  }

  @test
  'Extreme nesting'() {
    this.render(
      '{{this.foo}}<span>{{this.bar}}<a>{{this.baz}}<em>{{this.boo}}{{this.brew}}</em>{{this.bat}}</a></span><span><span>{{this.flute}}</span></span>{{this.argh}}',
      {
        foo: 'FOO',
        bar: 'BAR',
        baz: 'BAZ',
        boo: 'BOO',
        brew: 'BREW',
        bat: 'BAT',
        flute: 'FLUTE',
        argh: 'ARGH',
      }
    );
    this.assertHTML(
      'FOO<span>BAR<a>BAZ<em>BOOBREW</em>BAT</a></span><span><span>FLUTE</span></span>ARGH'
    );
    this.assertStableRerender();
  }

  @test
  'Simple blocks'() {
    this.render('<div>{{#if this.admin}}<p>{{this.user}}</p>{{/if}}!</div>', {
      admin: true,
      user: 'chancancode',
    });
    this.assertHTML('<div><p>chancancode</p>!</div>');
    this.assertStableRerender();

    const p = this.element.firstChild!.firstChild!;

    this.rerender({ admin: false });
    this.assertHTML('<div><!---->!</div>');
    this.assertStableNodes({ except: p });

    const comment = this.element.firstChild!.firstChild!;

    this.rerender({ admin: true });
    this.assertHTML('<div><p>chancancode</p>!</div>');
    this.assertStableNodes({ except: comment });
  }

  @test
  'Nested blocks'() {
    this.render(
      '<div>{{#if this.admin}}{{#if this.access}}<p>{{this.user}}</p>{{/if}}{{/if}}!</div>',
      {
        admin: true,
        access: true,
        user: 'chancancode',
      }
    );
    this.assertHTML('<div><p>chancancode</p>!</div>');
    this.assertStableRerender();

    let p = this.element.firstChild!.firstChild!;

    this.rerender({ admin: false });
    this.assertHTML('<div><!---->!</div>');
    this.assertStableNodes({ except: p });

    const comment = this.element.firstChild!.firstChild!;

    this.rerender({ admin: true });
    this.assertHTML('<div><p>chancancode</p>!</div>');
    this.assertStableNodes({ except: comment });

    p = this.element.firstChild!.firstChild!;

    this.rerender({ access: false });
    this.assertHTML('<div><!---->!</div>');
    this.assertStableNodes({ except: p });
  }

  @test
  Loops() {
    this.render(
      '<div>{{#each this.people key="handle" as |p|}}<span>{{p.handle}}</span> - {{p.name}}{{/each}}</div>',
      {
        people: [
          { handle: 'tomdale', name: 'Tom Dale' },
          { handle: 'chancancode', name: 'Godfrey Chan' },
          { handle: 'wycats', name: 'Yehuda Katz' },
        ],
      }
    );

    this.assertHTML(
      '<div><span>tomdale</span> - Tom Dale<span>chancancode</span> - Godfrey Chan<span>wycats</span> - Yehuda Katz</div>'
    );
    this.assertStableRerender();

    this.rerender({
      people: [
        { handle: 'tomdale', name: 'Thomas Dale' },
        { handle: 'wycats', name: 'Yehuda Katz' },
      ],
    });

    this.assertHTML(
      '<div><span>tomdale</span> - Thomas Dale<span>wycats</span> - Yehuda Katz</div>'
    );
  }

  @test
  'Simple helpers'() {
    this.registerHelper('testing', ([id]) => id);
    this.render('<div>{{testing this.title}}</div>', { title: 'hello' });
    this.assertHTML('<div>hello</div>');
    this.assertStableRerender();
  }

  @test
  'Constant negative numbers can render'() {
    this.registerHelper('testing', ([id]) => id);
    this.render('<div>{{testing -123321}}</div>');
    this.assertHTML('<div>-123321</div>');
    this.assertStableRerender();
  }

  @test
  'Large numeric literals (Number.MAX_SAFE_INTEGER)'() {
    this.registerHelper('testing', ([id]) => id);
    this.render('<div>{{testing 9007199254740991}}</div>');
    this.assertHTML('<div>9007199254740991</div>');
    this.assertStableRerender();
  }

  @test
  'Integer powers of 2'() {
    const ints = [];
    let i = Number.MAX_SAFE_INTEGER;
    while (i > 1) {
      ints.push(i);
      i = Math.round(i / 2);
    }
    i = Number.MIN_SAFE_INTEGER;
    while (i < -1) {
      ints.push(i);
      i = Math.round(i / 2);
    }
    this.registerHelper('testing', ([id]) => id);
    this.render(ints.map((i) => `{{${i}}}`).join('-'));
    this.assertHTML(ints.map((i) => `${i}`).join('-'));
    this.assertStableRerender();
  }

  @test
  'odd integers'() {
    this.render(
      '{{4294967296}} {{4294967295}} {{4294967294}} {{536870913}} {{536870912}} {{536870911}} {{268435455}}'
    );
    this.assertHTML('4294967296 4294967295 4294967294 536870913 536870912 536870911 268435455');
    this.assertStableRerender();
  }

  @test
  'Constant float numbers can render'() {
    this.registerHelper('testing', ([id]) => id);
    this.render('<div>{{testing 0.123}}</div>');
    this.assertHTML('<div>0.123</div>');
    this.assertStableRerender();
  }

  @test
  'GH#13999 The compiler can handle simple helpers with inline null parameter'() {
    let value;
    this.registerHelper('say-hello', (params) => {
      value = params[0];
      return 'hello';
    });
    this.render('<div>{{say-hello null}}</div>');
    this.assertHTML('<div>hello</div>');
    this.assert.strictEqual(value, null, 'is null');
    this.assertStableRerender();
  }

  @test
  'GH#13999 The compiler can handle simple helpers with inline string literal null parameter'() {
    let value;
    this.registerHelper('say-hello', (params) => {
      value = params[0];
      return 'hello';
    });

    this.render('<div>{{say-hello "null"}}</div>');
    this.assertHTML('<div>hello</div>');
    this.assert.strictEqual(value, 'null', 'is null string literal');
    this.assertStableRerender();
  }

  @test
  'GH#13999 The compiler can handle simple helpers with inline undefined parameter'() {
    let value: unknown = 'PLACEHOLDER';
    let length;
    this.registerHelper('say-hello', (params) => {
      length = params.length;
      value = params[0];
      return 'hello';
    });

    this.render('<div>{{say-hello undefined}}</div>');
    this.assertHTML('<div>hello</div>');
    this.assert.strictEqual(length, 1);
    this.assert.strictEqual(value, undefined, 'is undefined');
    this.assertStableRerender();
  }

  @test
  'GH#13999 The compiler can handle simple helpers with positional parameter undefined string literal'() {
    let value: unknown = 'PLACEHOLDER';
    let length;
    this.registerHelper('say-hello', (params) => {
      length = params.length;
      value = params[0];
      return 'hello';
    });

    this.render('<div>{{say-hello "undefined"}} undefined</div>');
    this.assertHTML('<div>hello undefined</div>');
    this.assert.strictEqual(length, 1);
    this.assert.strictEqual(value, 'undefined', 'is undefined string literal');
    this.assertStableRerender();
  }

  @test
  'GH#13999 The compiler can handle components with undefined named arguments'() {
    let value: unknown = 'PLACEHOLDER';
    this.registerHelper('say-hello', (_, hash) => {
      value = hash['foo'];
      return 'hello';
    });

    this.render('<div>{{say-hello foo=undefined}}</div>');
    this.assertHTML('<div>hello</div>');
    this.assert.strictEqual(value, undefined, 'is undefined');
    this.assertStableRerender();
  }

  @test
  'GH#13999 The compiler can handle components with undefined string literal named arguments'() {
    let value: unknown = 'PLACEHOLDER';
    this.registerHelper('say-hello', (_, hash) => {
      value = hash['foo'];
      return 'hello';
    });

    this.render('<div>{{say-hello foo="undefined"}}</div>');
    this.assertHTML('<div>hello</div>');
    this.assert.strictEqual(value, 'undefined', 'is undefined string literal');
    this.assertStableRerender();
  }

  @test
  'GH#13999 The compiler can handle components with null named arguments'() {
    let value;
    this.registerHelper('say-hello', (_, hash) => {
      value = hash['foo'];
      return 'hello';
    });

    this.render('<div>{{say-hello foo=null}}</div>');
    this.assertHTML('<div>hello</div>');
    this.assert.strictEqual(value, null, 'is null');
    this.assertStableRerender();
  }

  @test
  'GH#13999 The compiler can handle components with null string literal named arguments'() {
    let value;
    this.registerHelper('say-hello', (_, hash) => {
      value = hash['foo'];
      return 'hello';
    });

    this.render('<div>{{say-hello foo="null"}}</div>');
    this.assertHTML('<div>hello</div>');
    this.assert.strictEqual(value, 'null', 'is null string literal');
    this.assertStableRerender();
  }

  @test
  'Null curly in attributes'() {
    this.render('<div class="foo {{null}}">hello</div>');
    this.assertHTML('<div class="foo ">hello</div>');
    this.assertStableRerender();
  }

  @test
  'Null in primitive syntax'() {
    this.render('{{#if null}}NOPE{{else}}YUP{{/if}}');
    this.assertHTML('YUP');
    this.assertStableRerender();
  }

  @test
  'Sexpr helpers'() {
    this.registerHelper('testing', (params) => {
      return `${params[0]}!`;
    });

    this.render('<div>{{testing (testing "hello")}}</div>');
    this.assertHTML('<div>hello!!</div>');
    this.assertStableRerender();
  }

  @test
  'The compiler can handle multiple invocations of sexprs'() {
    this.registerHelper('testing', (params) => {
      return `${params[0]}${params[1]}`;
    });

    this.render(
      '<div>{{testing (testing "hello" this.foo) (testing (testing this.bar "lol") this.baz)}}</div>',
      {
        foo: 'FOO',
        bar: 'BAR',
        baz: 'BAZ',
      }
    );
    this.assertHTML('<div>helloFOOBARlolBAZ</div>');
    this.assertStableRerender();
  }

  @test
  'The compiler passes along the hash arguments'() {
    this.registerHelper('testing', (_, hash) => {
      return `${hash['first']}-${hash['second']}`;
    });

    this.render('<div>{{testing first="one" second="two"}}</div>');
    this.assertHTML('<div>one-two</div>');
    this.assertStableRerender();
  }

  @test
  'Attributes can be populated with helpers that generate a string'() {
    this.registerHelper('testing', (params) => {
      return params[0];
    });

    this.render('<a href="{{testing this.url}}">linky</a>', { url: 'linky.html' });
    this.assertHTML('<a href="linky.html">linky</a>');
    this.assertStableRerender();
  }

  @test
  'Attribute helpers take a hash'() {
    this.registerHelper('testing', (_, hash) => {
      return hash['path'];
    });

    this.render('<a href="{{testing path=this.url}}">linky</a>', { url: 'linky.html' });
    this.assertHTML('<a href="linky.html">linky</a>');
    this.assertStableRerender();
  }

  @test
  'Attributes containing multiple helpers are treated like a block'() {
    this.registerHelper('testing', (params) => {
      return params[0];
    });

    this.render('<a href="http://{{this.foo}}/{{testing this.bar}}/{{testing "baz"}}">linky</a>', {
      foo: 'foo.com',
      bar: 'bar',
    });
    this.assertHTML('<a href="http://foo.com/bar/baz">linky</a>');
    this.assertStableRerender();
  }

  @test
  'Elements inside a yielded block'() {
    this.render('{{#if true}}<div id="test">123</div>{{/if}}');
    this.assertHTML('<div id="test">123</div>');
    this.assertStableRerender();
  }

  @test
  'A simple block helper can return text'() {
    this.render('{{#if true}}test{{else}}not shown{{/if}}');
    this.assertHTML('test');
    this.assertStableRerender();
  }
}

const XHTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';
