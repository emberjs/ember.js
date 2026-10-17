/**
 * These tests render in Node.js, where no browser document exists.
 * The caller gives the document to `renderComponent`.
 *
 * Each test runs with two documents:
 *
 * - `happy-dom`, which has the browser DOM API and an HTML parser
 * - `@simple-dom/document`, which has only the nodes and no parser
 */
import { describe, it, expect } from 'vitest';
import { Window } from 'happy-dom';
import createHTMLDocument from '@simple-dom/document';
import Serializer from '@simple-dom/serializer';
import voidMap from '@simple-dom/void-map';
import { renderComponent } from 'ember-source/@ember/renderer/index.js';
import { run } from 'ember-source/@ember/runloop/index.js';
import { template } from 'ember-source/@ember/template-compiler/runtime.js';

const documents = {
  'happy-dom': {
    create: () => new Window().document,
    html: (element) => element.innerHTML,
  },
  '@simple-dom/document': {
    create: () => createHTMLDocument(),
    html: (element) => new Serializer(voidMap).serializeChildren(element),
  },
};

function render(dom, component, { isInteractive = false } = {}) {
  let document = dom.create();
  let into = document.createElement('div');
  let owner = {};

  let result = run(() =>
    renderComponent(component, {
      into,
      owner,
      env: { document, isInteractive, hasDOM: false },
    })
  );

  return { into, html: () => dom.html(into), result };
}

describe.each(Object.keys(documents))('render with %s', (name) => {
  let dom = documents[name];

  it('renders elements, attributes and text', () => {
    let title = 'Hello';
    let component = template('<h1 class="greeting" data-id={{id}}>{{title}}</h1>', {
      scope: () => ({ title, id: 1 }),
    });

    let { html } = render(dom, component);

    expect(html()).toBe('<h1 class="greeting" data-id="1">Hello</h1>');
  });

  it('escapes text', () => {
    let text = '<b>bold</b> & more';
    let component = template('<p>{{text}}</p>', { scope: () => ({ text }) });

    let { html } = render(dom, component);

    expect(html()).toBe('<p>&lt;b&gt;bold&lt;/b&gt; &amp; more</p>');
  });

  it('renders an HTML string from a triple curly', () => {
    let content = '<strong>hello</strong>';
    let component = template('<div>{{{content}}}</div>', { scope: () => ({ content }) });

    let { html } = render(dom, component);

    expect(html()).toBe('<div><strong>hello</strong></div>');
  });

  it('renders blocks and nested components', () => {
    let items = ['a', 'b'];
    let Item = template('<li>{{@value}}</li>');
    let component = template(
      '<ul>{{#each items as |item|}}<Item @value={{item}} />{{/each}}</ul>{{#if show}}<p>shown</p>{{/if}}',
      { scope: () => ({ items, Item, show: true }) }
    );

    let { html } = render(dom, component);

    expect(html()).toBe('<ul><li>a</li><li>b</li></ul><p>shown</p>');
  });

  it('renders svg and void elements', () => {
    let component = template('<svg viewBox="0 0 1 1"><circle r="1"></circle></svg><br><input>');

    let { html } = render(dom, component);

    expect(html()).toBe('<svg viewBox="0 0 1 1"><circle r="1"></circle></svg><br><input>');
  });

  it('removes the content on destroy', () => {
    let component = template('<p>content</p>');

    let { html, result } = render(dom, component);

    expect(html()).toBe('<p>content</p>');

    run(() => result.destroy());

    expect(html()).toBe('');
  });
});
