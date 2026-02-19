import { describe, test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { createAppContext } from './helpers/setup-app.js';
import { assertHtmlMatches } from './helpers/assert-html-matches.js';

describe('App Boot', () => {
  let ctx;

  beforeEach(async () => {
    ctx = await createAppContext();
  });

  afterEach(() => {
    ctx.destroy();
  });

  test('App boots and routes to a URL', async () => {
    await ctx.visit('/');
    assert.ok(ctx.app);
  });

  test('nested {{component}}', async () => {
    ctx.template('index', '{{root-component}}');

    ctx.component(
      'root-component',
      {
        location: 'World',
        hasExistence: true,
      },
      '<h1>Hello {{#if this.hasExistence}}{{this.location}}{{/if}}</h1><div>{{component "foo-bar"}}</div>'
    );

    ctx.component(
      'foo-bar',
      undefined,
      '<p>The files are *inside* the computer?!</p>'
    );

    const html = await ctx.renderToHTML('/');
    assert.ok(
      assertHtmlMatches(
        html,
        '<body><div id="EMBER_ID" class="ember-view"><h1>Hello World</h1><div><p>The files are *inside* the computer?!</p></div></div></body>'
      ),
      `HTML should match, got: ${html}`
    );
  });

  test('<LinkTo>', async () => {
    ctx.template('application', "<h1><LinkTo @route='photos'>Go to photos</LinkTo></h1>");
    ctx.routes(function () {
      this.route('photos');
    });

    const html = await ctx.renderToHTML('/');
    assert.ok(
      assertHtmlMatches(
        html,
        '<body><h1><a id="EMBER_ID" href="/photos" class="ember-view">Go to photos</a></h1></body>'
      ),
      `HTML should match, got: ${html}`
    );
  });

  test('{{link-to}}', async () => {
    ctx.template('application', "<h1>{{#link-to route='photos'}}Go to photos{{/link-to}}</h1>");
    ctx.routes(function () {
      this.route('photos');
    });

    const html = await ctx.renderToHTML('/');
    assert.ok(
      assertHtmlMatches(
        html,
        '<body><h1><a id="EMBER_ID" href="/photos" class="ember-view">Go to photos</a></h1></body>'
      ),
      `HTML should match, got: ${html}`
    );
  });

  test('non-escaped content', async () => {
    ctx.routes(function () {
      this.route('photos');
    });

    ctx.template('application', '<h1>{{{this.title}}}</h1>');
    ctx.controller('application', {
      title: '<b>Hello world</b>',
    });

    const html = await ctx.renderToHTML('/');
    assert.ok(
      assertHtmlMatches(html, '<body><h1><b>Hello world</b></h1></body>'),
      `HTML should match, got: ${html}`
    );
  });

  test('outlets', async () => {
    ctx.routes(function () {
      this.route('photos');
    });

    ctx.template('application', '<p>{{outlet}}</p>');
    ctx.template('index', '<span>index</span>');
    ctx.template('photos', '<em>photos</em>');

    const [indexHtml, photosHtml] = await ctx.all([
      ctx.renderToHTML('/'),
      ctx.renderToHTML('/photos'),
    ]);

    assert.ok(
      assertHtmlMatches(indexHtml, '<body><p><span>index</span></p></body>'),
      `index HTML should match, got: ${indexHtml}`
    );
    assert.ok(
      assertHtmlMatches(photosHtml, '<body><p><em>photos</em></p></body>'),
      `photos HTML should match, got: ${photosHtml}`
    );
  });

  test('lifecycle hooks disabled', async () => {
    let didReceiveAttrsCalled = false;
    let willRenderCalled = false;
    let didRenderCalled = false;
    let willInsertElementCalled = false;
    let didInsertElementCalled = false;

    ctx.template('application', "{{my-component foo='bar'}}{{outlet}}");

    ctx.component('my-component', {
      didReceiveAttrs() {
        didReceiveAttrsCalled = true;
      },
      willRender() {
        willRenderCalled = true;
      },
      didRender() {
        didRenderCalled = true;
      },
      willInsertElement() {
        willInsertElementCalled = true;
      },
      didInsertElement() {
        didInsertElementCalled = true;
      },
    });

    await ctx.renderToHTML('/');

    assert.ok(didReceiveAttrsCalled, 'should trigger didReceiveAttrs hook');
    assert.ok(!willRenderCalled, 'should not trigger willRender hook');
    assert.ok(!didRenderCalled, 'should not trigger didRender hook');
    assert.ok(!willInsertElementCalled, 'should not trigger willInsertElement hook');
    assert.ok(!didInsertElementCalled, 'should not trigger didInsertElement hook');
  });
});
