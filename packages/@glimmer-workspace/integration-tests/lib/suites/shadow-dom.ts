import type { Dict, Owner } from '@glimmer/interfaces';

import { castToBrowser } from '@glimmer/debug-util';

import { GlimmerishComponent } from '../components/emberish-glimmer';
import { RenderTest } from '../render-test';
import { test } from '../test-decorator';
import { tracked } from '../test-helpers/tracked';

export class ShadowDOMSuite extends RenderTest {
  static suiteName = 'Shadow DOM';

  @test
  'Renders content into shadow root via declarative shadow DOM (<template shadowrootmode="open">)'() {
    // Render a template that uses declarative shadow DOM syntax.
    // The <template shadowrootmode="open"> should cause Glimmer to attach a
    // shadow root to the parent element and render children into it.
    this.render('<div><template shadowrootmode="open"><p>{{this.message}}</p></template></div>', {
      message: 'shadow content',
    });

    const rootEl = castToBrowser(this.element, 'HTML');
    const host = rootEl.firstElementChild as HTMLElement | null;

    this.assert.ok(host !== null, 'host element exists in DOM');
    this.assert.ok(host?.shadowRoot !== null, 'shadow root is attached to host element');
    this.assert.strictEqual(
      host?.shadowRoot?.querySelector('p')?.textContent,
      'shadow content',
      'shadow root contains the rendered content'
    );
  }

  @test
  'Shadow DOM content renders alongside regular DOM content'() {
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
  }

  @test
  '<template shadowrootmode="open"> as component root renders into the parent element shadow root'() {
    this.registerComponent(
      'TemplateOnly',
      'ShadowComp',
      '<template shadowrootmode="open"><p>{{@message}}</p></template>'
    );

    // When the component root is <template shadowrootmode="open">, the shadow root is
    // attached to the element that immediately contains the component (in this case, the
    // <div class="host">).
    this.render('<div class="host"><ShadowComp @message={{this.msg}} /></div>', {
      msg: 'initial',
    });

    const rootEl = castToBrowser(this.element, 'HTML');
    const host = rootEl.querySelector('.host') as HTMLElement | null;

    this.assert.ok(host !== null, 'host element exists');
    this.assert.ok(host?.shadowRoot !== null, 'shadow root is attached to the host element');
    this.assert.strictEqual(
      host?.shadowRoot?.querySelector('p')?.textContent,
      'initial',
      'initial content rendered into shadow root'
    );

    this.assertStableRerender();

    // Rerender with new arg — shadow root content should update
    this.rerender({ msg: 'updated' });
    this.assert.strictEqual(
      host?.shadowRoot?.querySelector('p')?.textContent,
      'updated',
      'shadow root content updated after rerender'
    );
  }

  @test
  '<template shadowrootmode="open"> as component root re-renders correctly after full component recreation'() {
    this.registerComponent(
      'TemplateOnly',
      'ShadowComp',
      '<template shadowrootmode="open"><span>{{@label}}</span></template>'
    );

    // Wrap in a conditional so we can force component destruction + recreation
    this.render(
      '{{#if this.show}}<div class="host"><ShadowComp @label={{this.label}} /></div>{{/if}}',
      { show: true, label: 'first' }
    );

    const rootEl = castToBrowser(this.element, 'HTML');
    const getHost = () => rootEl.querySelector('.host') as HTMLElement | null;

    this.assert.ok(getHost()?.shadowRoot !== null, 'shadow root attached on first render');
    this.assert.strictEqual(
      getHost()?.shadowRoot?.querySelector('span')?.textContent,
      'first',
      'first render content correct'
    );

    // Remove the component from the DOM
    this.rerender({ show: false, label: 'first' });
    this.assert.strictEqual(getHost(), null, 'host element removed from DOM');

    // Re-insert the component — the shadow root is on a fresh <div class="host">,
    // so attachShadow should succeed on the new element
    this.rerender({ show: true, label: 'second' });
    this.assert.ok(getHost()?.shadowRoot !== null, 'shadow root attached on second render');
    this.assert.strictEqual(
      getHost()?.shadowRoot?.querySelector('span')?.textContent,
      'second',
      're-rendered content correct in shadow root'
    );
  }

  @test
  '<template shadowrootmode="open"> as component root with tracked state re-renders into same shadow root'() {
    class Counter extends GlimmerishComponent {}

    this.registerComponent(
      'Glimmer',
      'Counter',
      '<template shadowrootmode="open"><p>{{@count}}</p></template>',
      Counter as any
    );

    // Render the counter component with a wrapping div
    this.render('<div class="host"><Counter @count={{this.count}} /></div>', { count: 0 });

    const rootEl = castToBrowser(this.element, 'HTML');
    const host = rootEl.querySelector('.host') as HTMLElement | null;

    this.assert.ok(host?.shadowRoot !== null, 'shadow root attached');
    this.assert.strictEqual(
      host?.shadowRoot?.querySelector('p')?.textContent,
      '0',
      'initial count renders in shadow root'
    );

    // Update tracked state — shadow root should be reused (not recreated)
    const shadowRootRef = host?.shadowRoot;
    this.rerender({ count: 1 });

    this.assert.strictEqual(
      host?.shadowRoot?.querySelector('p')?.textContent,
      '1',
      'count updated in shadow root'
    );
    this.assert.strictEqual(
      host?.shadowRoot,
      shadowRootRef,
      'same shadow root instance reused (not recreated)'
    );
  }

  @test
  '<template shadowrootmode="open"> as component root re-renders via internal @tracked property (no rerender args)'() {
    let instance = this.capture<Counter>();

    class Counter extends GlimmerishComponent {
      @tracked count = 0;

      constructor(owner: Owner, args: Dict) {
        super(owner, args);
        instance.capture(this);
      }
    }

    this.registerComponent(
      'Glimmer',
      'Counter',
      '<template shadowrootmode="open"><p>{{this.count}}</p></template>',
      Counter as any
    );

    // No data is passed to render — the count is owned entirely by the component
    this.render('<div class="host"><Counter /></div>');

    const rootEl = castToBrowser(this.element, 'HTML');
    const host = rootEl.querySelector('.host') as HTMLElement | null;
    const shadowRootRef = host?.shadowRoot;

    this.assert.ok(shadowRootRef !== null, 'shadow root attached on first render');
    this.assert.strictEqual(
      host?.shadowRoot?.querySelector('p')?.textContent,
      '0',
      'initial count renders in shadow root'
    );

    // Mutate the tracked property directly — no data passed to rerender
    instance.captured.count = 1;
    this.rerender();

    this.assert.strictEqual(
      host?.shadowRoot?.querySelector('p')?.textContent,
      '1',
      'count updated in shadow root after tracked mutation'
    );
    this.assert.strictEqual(
      host?.shadowRoot,
      shadowRootRef,
      'same shadow root instance reused (not recreated) after tracked mutation'
    );
  }

  @test
  'conditional <template shadowrootmode="open"> inside a host element attaches shadow root when rendered'() {
    this.render(
      '<div class="host">{{#if this.useShadow}}<template shadowrootmode="open"><p>shadow content</p></template>{{else}}<div>regular content</div>{{/if}}</div>',
      { useShadow: true }
    );

    const rootEl = castToBrowser(this.element, 'HTML');
    const host = rootEl.querySelector('.host') as HTMLElement | null;

    this.assert.ok(host !== null, 'host element exists');
    this.assert.ok(host?.shadowRoot !== null, 'shadow root is attached when useShadow=true');
    this.assert.strictEqual(
      host?.shadowRoot?.querySelector('p')?.textContent,
      'shadow content',
      'shadow content renders in shadow root'
    );

    // Switch to regular content branch
    this.rerender({ useShadow: false });
    // The shadow root persists on the host element (platform behavior), but Glimmer
    // tears down the remote element block and renders <div>regular content</div>
    // into the host's light DOM.
    this.assert.strictEqual(
      host?.querySelector('div')?.textContent,
      'regular content',
      'regular content renders in host after switching from shadow branch'
    );
  }

  @test
  'conditional <template shadowrootmode="open"> re-enables shadow root on toggle back (exercises existingShadowRoot path)'() {
    // When a declarative shadow root block is torn down and re-created on the same
    // host element, VM_ATTACH_SHADOW_ROOT_OP encounters rawParent.shadowRoot !== null
    // (shadow roots cannot be removed from a host). The existingShadowRoot branch in
    // the opcode clears and reuses the existing shadow root so that attachShadow() is
    // not called again (which would throw DOMException).
    this.render(
      '<div class="host">{{#if this.useShadow}}<template shadowrootmode="open"><p>{{this.msg}}</p></template>{{else}}<span>off</span>{{/if}}</div>',
      { useShadow: true, msg: 'first' }
    );

    const rootEl = castToBrowser(this.element, 'HTML');
    const host = rootEl.querySelector('.host') as HTMLElement | null;
    const initialShadowRoot = host?.shadowRoot;

    this.assert.ok(initialShadowRoot !== null, 'shadow root attached on first render');
    this.assert.strictEqual(
      host?.shadowRoot?.querySelector('p')?.textContent,
      'first',
      'initial shadow content correct'
    );

    // Tear down the shadow DOM block — shadow root stays on the host (platform behavior)
    this.rerender({ useShadow: false, msg: 'first' });
    this.assert.ok(host?.querySelector('span') !== null, 'else branch rendered');

    // Re-enable shadow DOM — VM_ATTACH_SHADOW_ROOT_OP hits the existingShadowRoot path
    this.rerender({ useShadow: true, msg: 'second' });
    this.assert.ok(host?.shadowRoot !== null, 'shadow root still attached after re-enable');
    this.assert.strictEqual(
      host?.shadowRoot,
      initialShadowRoot,
      'same shadow root instance reused (not recreated)'
    );
    this.assert.strictEqual(
      host?.shadowRoot?.querySelector('p')?.textContent,
      'second',
      'shadow content updated correctly after re-enable'
    );
  }
}
