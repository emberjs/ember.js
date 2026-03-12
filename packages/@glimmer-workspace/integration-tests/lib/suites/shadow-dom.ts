import { castToBrowser } from '@glimmer/debug-util';

import { RenderTest } from '../render-test';
import { test } from '../test-decorator';

export class ShadowDOMSuite extends RenderTest {
  static suiteName = 'Shadow DOM';

  @test
  'Renders content into shadow root via declarative shadow DOM (<template shadowrootmode="open">)'() {
    if (typeof document === 'undefined' || !('attachShadow' in document.createElement('div'))) {
      this.assert.ok(true, 'Shadow DOM not supported, skipping');
      return;
    }

    // Render a template that uses declarative shadow DOM syntax.
    // The <template shadowrootmode="open"> should cause Glimmer to attach a
    // shadow root to the parent element and render children into it.
    this.render(
      '<div><template shadowrootmode="open"><p>{{this.message}}</p></template></div>',
      { message: 'shadow content' }
    );

    const rootEl = castToBrowser(this.element, 'HTML');
    const host = rootEl.firstElementChild as HTMLElement | null;

    this.assert.ok(host !== null, 'host element exists in DOM');
    this.assert.ok(host?.shadowRoot !== null, 'shadow root is attached to host element');
    this.assert.strictEqual(
      host?.shadowRoot?.querySelector('p')?.textContent,
      'shadow content',
      'shadow root contains the rendered content'
    );

    // The <template> element should NOT be in the host's regular DOM children
    this.assert.strictEqual(
      host?.querySelector('template'),
      null,
      '<template> element is not in the regular DOM'
    );
  }

  @test
  'Shadow DOM content renders alongside regular DOM content'() {
    if (typeof document === 'undefined' || !('attachShadow' in document.createElement('div'))) {
      this.assert.ok(true, 'Shadow DOM not supported, skipping');
      return;
    }

    this.render(
      '<div><p>regular content</p><div><template shadowrootmode="open"><em>shadow content</em></template></div></div>'
    );

    const rootEl = castToBrowser(this.element, 'HTML');
    const outerDiv = rootEl.firstElementChild as HTMLElement | null;
    const shadowHost = outerDiv?.querySelector('div') as HTMLElement | null;

    this.assert.ok(outerDiv !== null, 'outer element exists');
    this.assert.strictEqual(
      outerDiv?.querySelector('p')?.textContent,
      'regular content',
      'regular content is rendered normally'
    );

    this.assert.ok(shadowHost?.shadowRoot !== null, 'shadow root is attached');
    this.assert.strictEqual(
      shadowHost?.shadowRoot?.querySelector('em')?.textContent,
      'shadow content',
      'shadow content is in shadow root'
    );

    // Shadow host should not have <template> as a regular child
    this.assert.strictEqual(
      shadowHost?.querySelector('template'),
      null,
      '<template> element is not in the regular DOM'
    );
  }
}
