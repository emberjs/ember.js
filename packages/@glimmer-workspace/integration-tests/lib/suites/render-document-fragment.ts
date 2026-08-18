import { RenderTest } from '../render-test';
import { test } from '../test-decorator';

function paragraph(text: string): HTMLParagraphElement {
  const el = document.createElement('p');
  el.textContent = text;
  return el;
}

export class RenderDocumentFragmentSuite extends RenderTest {
  static suiteName = '{{fragment}} (DocumentFragment)';

  @test
  'renders the children of a fragment'() {
    const fragment = document.createDocumentFragment();
    fragment.appendChild(paragraph('one'));
    fragment.appendChild(paragraph('two'));

    this.render('<div>{{this.fragment}}</div>', { fragment });

    this.assertHTML('<div><!----><p>one</p><p>two</p><!----></div>');
    this.assert.strictEqual(fragment.childNodes.length, 0, 'the fragment is empty after render');
    this.assertStableRerender();
  }

  @test
  'renders an empty fragment'() {
    const fragment = document.createDocumentFragment();

    this.render('<div>{{this.fragment}}</div>', { fragment });

    this.assertHTML('<div><!----><!----></div>');
    this.assertStableRerender();
  }

  @test
  'content rendered into the fragment afterwards goes to the rendered location'() {
    const fragment = document.createDocumentFragment();

    this.render(
      '<div>{{this.fragment}}{{#in-element this.fragment}}[{{this.foo}}]{{/in-element}}</div>',
      { fragment, foo: 'first' }
    );

    this.assertHTML('<div><!---->[first]<!----><!----></div>');
    this.assertStableRerender();

    this.rerender({ foo: 'second' });
    this.assertHTML('<div><!---->[second]<!----><!----></div>');

    this.rerender({ foo: 'first' });
    this.assertHTML('<div><!---->[first]<!----><!----></div>');
  }

  @test
  'content rendered into the fragment beforehand moves to the rendered location'() {
    const fragment = document.createDocumentFragment();

    this.render(
      '<div>{{#in-element this.fragment}}[{{this.foo}}]{{/in-element}}{{this.fragment}}</div>',
      { fragment, foo: 'first' }
    );

    this.assertHTML('<div><!----><!---->[first]<!----></div>');
    this.assertStableRerender();

    this.rerender({ foo: 'second' });
    this.assertHTML('<div><!----><!---->[second]<!----></div>');
  }

  @test
  'the region keeps its place when its content grows'() {
    const fragment = document.createDocumentFragment();

    this.render(
      '<div>{{this.fragment}}<b>after</b></div>' +
        '{{#in-element this.fragment}}{{#each this.items key="@identity" as |item|}}[{{item}}]{{/each}}{{/in-element}}',
      { fragment, items: ['a'] }
    );

    this.assertHTML('<div><!---->[a]<!----><b>after</b></div><!---->');
    this.assertStableRerender();

    this.rerender({ items: ['a', 'b'] });
    this.assertHTML('<div><!---->[a][b]<!----><b>after</b></div><!---->');

    this.rerender({ items: ['b'] });
    this.assertHTML('<div><!---->[b]<!----><b>after</b></div><!---->');
  }

  @test
  'sibling fragments keep separate regions'() {
    const first = document.createDocumentFragment();
    const second = document.createDocumentFragment();

    this.render(
      '<div>{{this.first}}{{this.second}}</div>' +
        '{{#in-element this.first}}[first:{{this.one}}]{{/in-element}}' +
        '{{#in-element this.second}}[second:{{this.two}}]{{/in-element}}',
      { first, second, one: 1, two: 2 }
    );

    this.assertHTML('<div><!---->[first:1]<!----><!---->[second:2]<!----></div><!----><!---->');
    this.assertStableRerender();

    this.rerender({ one: 3 });
    this.assertHTML('<div><!---->[first:3]<!----><!---->[second:2]<!----></div><!----><!---->');

    this.rerender({ two: 4 });
    this.assertHTML('<div><!---->[first:3]<!----><!---->[second:4]<!----></div><!----><!---->');
  }

  @test
  'sibling regions stay in template order when both grow'() {
    const first = document.createDocumentFragment();
    const second = document.createDocumentFragment();

    this.render(
      '<div>{{this.first}}{{this.second}}</div>' +
        '{{#in-element this.first}}{{#each this.left key="@identity" as |item|}}[L{{item}}]{{/each}}{{/in-element}}' +
        '{{#in-element this.second}}{{#each this.right key="@identity" as |item|}}[R{{item}}]{{/each}}{{/in-element}}',
      { first, second, left: [1], right: [1] }
    );

    this.assertHTML('<div><!---->[L1]<!----><!---->[R1]<!----></div><!----><!---->');

    this.rerender({ left: [1, 2], right: [1, 2] });
    this.assertHTML('<div><!---->[L1][L2]<!----><!---->[R1][R2]<!----></div><!----><!---->');
  }

  @test
  '{{#in-element}} without insertBefore replaces the content of the region'() {
    const fragment = document.createDocumentFragment();
    fragment.appendChild(paragraph('static'));

    this.render(
      '<div>{{this.fragment}}{{#in-element this.fragment}}[{{this.foo}}]{{/in-element}}</div>',
      { fragment, foo: 'fresh' }
    );

    this.assertHTML('<div><!---->[fresh]<!----><!----></div>');
    this.assertStableRerender();
  }

  @test
  '{{#in-element}} with insertBefore=null appends to the region'() {
    const fragment = document.createDocumentFragment();
    fragment.appendChild(paragraph('static'));

    this.render(
      '<div>{{this.fragment}}{{#in-element this.fragment insertBefore=null}}[{{this.foo}}]{{/in-element}}</div>',
      { fragment, foo: 'extra' }
    );

    this.assertHTML('<div><!----><p>static</p>[extra]<!----><!----></div>');
    this.assertStableRerender();
  }

  @test
  'two {{#in-element}} blocks into one rendered fragment keep their order'() {
    const fragment = document.createDocumentFragment();

    this.render(
      '<div>{{this.fragment}}' +
        '{{#in-element this.fragment}}[{{this.one}}]{{/in-element}}' +
        '{{#in-element this.fragment insertBefore=null}}[{{this.two}}]{{/in-element}}</div>',
      { fragment, one: 'one', two: 'two' }
    );

    this.assertHTML('<div><!---->[one][two]<!----><!----><!----></div>');
    this.assertStableRerender();

    this.rerender({ two: 'second' });
    this.assertHTML('<div><!---->[one][second]<!----><!----><!----></div>');
  }

  @test
  'removing and restoring the fragment renders the content again'() {
    const fragment = document.createDocumentFragment();

    this.render(
      '<div>{{#if this.show}}{{this.fragment}}' +
        '{{#in-element this.fragment}}[{{this.foo}}]{{/in-element}}{{/if}}</div>',
      { show: true, fragment, foo: 'here' }
    );

    this.assertHTML('<div><!---->[here]<!----><!----></div>');

    this.rerender({ show: false });
    this.assertHTML('<div><!----></div>');

    this.rerender({ show: true });
    this.assertHTML('<div><!---->[here]<!----><!----></div>');

    this.rerender({ foo: 'again' });
    this.assertHTML('<div><!---->[again]<!----><!----></div>');
  }

  @test
  'removing and restoring the content of a live region'() {
    const fragment = document.createDocumentFragment();

    this.render(
      '<div>{{this.fragment}}<b>after</b></div>' +
        '{{#if this.show}}{{#in-element this.fragment}}[{{this.foo}}]{{/in-element}}{{/if}}',
      { fragment, show: true, foo: 'here' }
    );

    this.assertHTML('<div><!---->[here]<!----><b>after</b></div><!---->');
    this.assertStableRerender();

    this.rerender({ show: false });
    this.assertHTML('<div><!----><!----><b>after</b></div><!---->');

    this.rerender({ show: true });
    this.assertHTML('<div><!---->[here]<!----><b>after</b></div><!---->');

    this.rerender({ foo: 'again' });
    this.assertHTML('<div><!---->[again]<!----><b>after</b></div><!---->');
  }

  @test
  'swapping between a fragment and other content'() {
    const fragment = document.createDocumentFragment();
    fragment.appendChild(paragraph('one'));

    const other = document.createDocumentFragment();
    other.appendChild(paragraph('two'));

    this.render('<div>{{this.value}}</div>', { value: fragment });
    this.assertHTML('<div><!----><p>one</p><!----></div>');

    this.rerender({ value: 'plain text' });
    this.assertHTML('<div>plain text</div>');

    this.rerender({ value: other });
    this.assertHTML('<div><!----><p>two</p><!----></div>');
  }

  @test
  'a fragment rendered inside another fragment'() {
    const outer = document.createDocumentFragment();
    const inner = document.createDocumentFragment();

    this.render(
      '<div>{{this.outer}}</div>' +
        '{{#in-element this.outer}}{{this.inner}}{{/in-element}}' +
        '{{#in-element this.inner}}[{{this.foo}}]{{/in-element}}',
      { outer, inner, foo: 'nested' }
    );

    this.assertHTML('<div><!----><!---->[nested]<!----><!----></div><!----><!---->');
    this.assertStableRerender();

    this.rerender({ foo: 'updated' });
    this.assertHTML('<div><!----><!---->[updated]<!----><!----></div><!----><!---->');
  }
}
