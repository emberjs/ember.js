import type { SimpleElement, SimpleNode } from '@glimmer/interfaces';
import { NS_SVG } from '@glimmer/constants';
import { jitSuite, RenderTest, test } from '@glimmer-workspace/integration-tests';

import { assert } from './support';

function namespaces(element: SimpleElement): string[] {
  let result: string[] = [];

  function visit(node: SimpleNode) {
    if (node.nodeType === 1) {
      let el = node as SimpleElement;
      result.push(`${el.tagName.toLowerCase()}:${el.namespaceURI === NS_SVG ? 'svg' : 'html'}`);
    }

    for (let child = node.firstChild; child; child = child.nextSibling) {
      visit(child);
    }
  }

  for (let child = element.firstChild; child; child = child.nextSibling) {
    visit(child);
  }

  return result;
}

class ElementShellTest extends RenderTest {
  static suiteName = 'Element shells';

  @test
  'static elements, text and comments'() {
    this.render('<div class="a" data-x="1"><span>hello</span> <!-- c --><b>bold</b></div>');

    this.assertHTML('<div class="a" data-x="1"><span>hello</span> <!-- c --><b>bold</b></div>');
    this.assertStableRerender();
  }

  @test
  'every render gets its own nodes'() {
    this.render(
      '{{#each this.items key="@index" as |item|}}<p class="x"><i>{{item}}</i></p>{{/each}}',
      { items: ['a', 'b'] }
    );

    this.assertHTML('<p class="x"><i>a</i></p><p class="x"><i>b</i></p>');

    let first = this.element.firstChild as SimpleElement;
    let second = first.nextSibling as SimpleElement;
    assert.notStrictEqual(first.firstChild, second.firstChild, 'the copies share no nodes');

    this.rerender({ items: ['a', 'b', 'c'] });
    this.assertHTML('<p class="x"><i>a</i></p><p class="x"><i>b</i></p><p class="x"><i>c</i></p>');
  }

  @test
  'dynamic text between static nodes'() {
    this.render('<p>a {{this.x}} b <i>{{this.y}}</i> c{{this.z}}</p>', {
      x: 'X',
      y: 'Y',
      z: 'Z',
    });

    this.assertHTML('<p>a X b <i>Y</i> cZ</p>');
    this.assertStableRerender();

    this.rerender({ x: 'X2', y: 'Y2', z: 'Z2' });
    this.assertHTML('<p>a X2 b <i>Y2</i> cZ2</p>');
    this.assertStableNodes();

    this.rerender({ x: 'X', y: 'Y', z: 'Z' });
    this.assertHTML('<p>a X b <i>Y</i> cZ</p>');
    this.assertStableNodes();
  }

  @test
  'blocks between static nodes keep their place'() {
    this.render(
      '<ul><li>first</li>{{#each this.items key="@index" as |item|}}<li>{{item}}</li>{{/each}}<li>last</li>{{#if this.show}}<li>shown</li>{{/if}}</ul>',
      { items: ['a'], show: false }
    );

    this.assertHTML('<ul><li>first</li><li>a</li><li>last</li><!----></ul>');
    this.assertStableRerender();

    this.rerender({ items: ['a', 'b', 'c'], show: true });
    this.assertHTML(
      '<ul><li>first</li><li>a</li><li>b</li><li>c</li><li>last</li><li>shown</li></ul>'
    );

    this.rerender({ items: [], show: false });
    this.assertHTML('<ul><li>first</li><!----><li>last</li><!----></ul>');

    this.rerender({ items: ['a'], show: false });
    this.assertHTML('<ul><li>first</li><li>a</li><li>last</li><!----></ul>');
  }

  @test
  'dynamic attributes on nested elements'() {
    this.render(
      '<div class="outer"><a href={{this.url}} class="link">go</a><span title={{this.title}}></span></div>',
      { url: '/a', title: 't' }
    );

    this.assertHTML(
      '<div class="outer"><a href="/a" class="link">go</a><span title="t"></span></div>'
    );
    this.assertStableRerender();

    this.rerender({ url: '/b', title: null });
    this.assertHTML('<div class="outer"><a href="/b" class="link">go</a><span></span></div>');
    this.assertStableNodes();
  }

  @test
  'attributes keep their source order'() {
    this.render('<div id={{this.id}} class="a" data-b="b"></div><p class="p" id={{this.id}}></p>', {
      id: 'x',
    });

    let div = this.element.firstChild as unknown as Element;
    let p = div.nextSibling as unknown as Element;

    assert.deepEqual(
      Array.from(div.attributes, (attr) => attr.name),
      ['id', 'class', 'data-b']
    );
    assert.deepEqual(
      Array.from(p.attributes, (attr) => attr.name),
      ['class', 'id']
    );
  }

  @test
  'components inside a shell'() {
    this.registerComponent('TemplateOnly', 'Label', '<b class="label">{{@text}}</b>');

    this.render(
      '<div class="card"><h2>title</h2><Label @text={{this.text}} /><p>footer</p></div>',
      {
        text: 'one',
      }
    );

    this.assertHTML('<div class="card"><h2>title</h2><b class="label">one</b><p>footer</p></div>');
    this.assertStableRerender();

    this.rerender({ text: 'two' });
    this.assertHTML('<div class="card"><h2>title</h2><b class="label">two</b><p>footer</p></div>');
    this.assertStableNodes();
  }

  @test
  'SVG shells use the SVG namespace'() {
    this.render(
      '<svg><g class="g"><circle r="1"></circle>{{#if this.show}}<rect class="r"></rect>{{/if}}</g></svg>',
      { show: true }
    );

    assert.deepEqual(namespaces(this.element), ['svg:svg', 'g:svg', 'circle:svg', 'rect:svg']);

    this.rerender({ show: false });
    this.rerender({ show: true });
    assert.deepEqual(namespaces(this.element), ['svg:svg', 'g:svg', 'circle:svg', 'rect:svg']);
  }

  @test
  'one shell in HTML and in SVG'() {
    this.registerComponent('TemplateOnly', 'Link', '<a class="link"><title>x</title></a>');

    this.render('<svg><Link /></svg><div><Link /></div>');

    assert.deepEqual(namespaces(this.element), [
      'svg:svg',
      'a:svg',
      'title:svg',
      'div:html',
      'a:html',
      'title:html',
    ]);
  }

  @test
  'foreignObject content uses the HTML namespace'() {
    this.render(
      '<svg><foreignObject class="f"><div class="d"><span>hi</span></div></foreignObject></svg>'
    );

    assert.deepEqual(namespaces(this.element), [
      'svg:svg',
      'foreignobject:svg',
      'div:html',
      'span:html',
    ]);
  }

  @test
  'modifiers on copied elements install inside out'() {
    let installed: string[] = [];

    this.registerModifier(
      'track',
      class {
        element?: SimpleElement;
        didInsertElement(params: unknown[]) {
          installed.push(`${String(params[0])} ${this.element?.getAttribute('class')}`);
        }
        didUpdate() {}
        willDestroyElement() {}
      }
    );

    this.render(
      '<div class="outer" {{track "outer"}}><p>text</p><span class="inner" {{track "inner"}}>{{this.text}}</span></div>',
      { text: 'a' }
    );

    this.assertHTML('<div class="outer"><p>text</p><span class="inner">a</span></div>');
    assert.deepEqual(installed, ['inner inner', 'outer outer']);

    this.rerender({ text: 'b' });
    this.assertHTML('<div class="outer"><p>text</p><span class="inner">b</span></div>');
  }

  @test
  '...attributes on an element in a shell'() {
    this.registerComponent(
      'TemplateOnly',
      'Card',
      '<section class="card" ...attributes><h2>title</h2>{{yield}}</section>'
    );

    this.render('<Card class="wide" data-x={{this.x}}>body</Card>', { x: '1' });
    this.assertHTML('<section class="card wide" data-x="1"><h2>title</h2>body</section>');
    this.assertStableRerender();

    this.rerender({ x: '2' });
    this.assertHTML('<section class="card wide" data-x="2"><h2>title</h2>body</section>');
    this.assertStableNodes();
  }

  @test
  'custom elements are created before their properties are set'() {
    if (!customElements.get('x-shell-property')) {
      customElements.define(
        'x-shell-property',
        class extends HTMLElement {
          received: unknown;
          set data(value: unknown) {
            this.received = value;
          }
          get data() {
            return this.received;
          }
        }
      );
    }

    let data = { a: 1 };
    this.render(
      '<div class="wrap"><x-shell-property data={{this.data}}></x-shell-property></div>',
      {
        data,
      }
    );

    let element = (this.element.firstChild as SimpleElement).firstChild as unknown as {
      received: unknown;
    };
    assert.strictEqual(element.received, data, 'the property setter received the value');
  }

  @test
  'dynamic content at the edges of a block'() {
    this.render('{{#if this.show}}{{this.a}}<b>static</b>{{this.b}}{{/if}}<i>after</i>', {
      show: true,
      a: 'A',
      b: 'B',
    });

    this.assertHTML('A<b>static</b>B<i>after</i>');
    this.assertStableRerender();

    this.rerender({ show: false });
    this.assertHTML('<!----><i>after</i>');

    this.rerender({ show: true, a: 'A2' });
    this.assertHTML('A2<b>static</b>B<i>after</i>');
  }

  @test
  'a block clears every node when only a later element has content'() {
    this.render('{{#if this.show}}<strong>a</strong> <em>{{this.name}}</em>{{/if}}<i>end</i>', {
      show: true,
      name: 'b',
    });

    this.assertHTML('<strong>a</strong> <em>b</em><i>end</i>');

    this.rerender({ show: false });
    this.assertHTML('<!----><i>end</i>');
  }

  @test
  'text that turns into HTML keeps its place'() {
    let html = { toHTML: () => '<u>html</u>', toString: () => '<u>html</u>' };

    this.render(
      '{{#if this.show}}<p>before {{this.value}} after</p>{{this.value}}{{/if}}<i>end</i>',
      {
        show: true,
        value: 'text',
      }
    );
    this.assertHTML('<p>before text after</p>text<i>end</i>');

    this.rerender({ value: html });
    this.assertHTML('<p>before <u>html</u> after</p><u>html</u><i>end</i>');

    this.rerender({ value: 'text' });
    this.assertHTML('<p>before text after</p>text<i>end</i>');

    this.rerender({ value: html });
    this.rerender({ show: false });
    this.assertHTML('<!----><i>end</i>');
  }
}

jitSuite(ElementShellTest);
