import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createComponentContext } from './helpers/setup-component.js';

describe('Components can be rendered without a DOM dependency', () => {
  let ctx;

  beforeEach(async () => {
    ctx = await createComponentContext();
  });

  afterEach(() => {
    ctx.destroy();
  });

  test('Simple component', () => {
    let html = ctx.render('<h1>Hello</h1>');
    assert.ok(html.match(/<h1>Hello<\/h1>/), `expected <h1>Hello</h1> in: ${html}`);
  });

  test('Component with dynamic value', () => {
    ctx.set('location', 'World');

    let html = ctx.render('<h1>Hello {{this.location}}</h1>');
    assert.ok(html.match(/<h1>Hello World<\/h1>/), `expected <h1>Hello World</h1> in: ${html}`);
  });

  test('Ensure undefined attributes requiring protocol sanitization do not error', () => {
    ctx.owner.register(
      'component:fake-link',
      class extends ctx.Component {
        tagName = 'link';
        attributeBindings = ['href', 'rel'];
        rel = 'canonical';
      }
    );

    let html = ctx.render('{{fake-link}}');
    assert.ok(html.match(/rel="canonical"/), `expected rel="canonical" in: ${html}`);
  });

  test('attributes requiring protocol sanitization do not error', () => {
    ctx.set('someHref', 'https://foo.com/');

    let html = ctx.render('<a href={{this.someHref}}>Some Link</a>');
    assert.ok(
      html.match(/<a href="https:\/\/foo.com\/">Some Link<\/a>/),
      `expected link in: ${html}`
    );
  });
});
