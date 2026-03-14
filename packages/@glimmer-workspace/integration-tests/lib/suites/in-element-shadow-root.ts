import type { Owner } from '@glimmer/interfaces';
import type { Dict } from '@glimmer/util';

import { GlimmerishComponent } from '../components/emberish-glimmer';
import { RenderTest } from '../render-test';
import { test } from '../test-decorator';
import { tracked } from '../test-helpers/tracked';

function hasShadowDom() {
  return typeof document !== 'undefined' && 'attachShadow' in document.createElement('div');
}

export class InElementShadowRootSuite extends RenderTest {
  static suiteName = '#in-element (ShadowRoot)';

  @test
  'Renders curlies into a ShadowRoot'() {
    if (!hasShadowDom()) {
      this.assert.ok(true, 'Shadow DOM not supported, skipping');
      return;
    }

    const hostElement = document.createElement('div');
    const shadowRoot = hostElement.attachShadow({ mode: 'open' });

    this.render('{{#in-element this.shadowRoot}}[{{this.foo}}]{{/in-element}}', {
      shadowRoot,
      foo: 'Hello Shadow!',
    });

    this.assert.strictEqual(
      shadowRoot.textContent,
      '[Hello Shadow!]',
      'content rendered in shadow root'
    );
    this.assertHTML('<!---->');
    this.assertStableRerender();

    this.rerender({ foo: 'Updated!' });
    this.assert.strictEqual(shadowRoot.textContent, '[Updated!]', 'content updated in shadow root');
    this.assertHTML('<!---->');

    this.rerender({ foo: 'Hello Shadow!' });
    this.assert.strictEqual(
      shadowRoot.textContent,
      '[Hello Shadow!]',
      'content reverted in shadow root'
    );
    this.assertHTML('<!---->');
  }

  @test
  'Renders curlies into a DocumentFragment'() {
    if (typeof document === 'undefined') {
      this.assert.ok(true, 'DOM not supported, skipping');
      return;
    }

    const templateElement = document.createElement('template');
    const fragment = templateElement.content;

    this.render('{{#in-element this.fragment}}[{{this.foo}}]{{/in-element}}', {
      fragment,
      foo: 'Hello Fragment!',
    });

    this.assert.strictEqual(
      fragment.textContent,
      '[Hello Fragment!]',
      'content rendered in document fragment'
    );
    this.assertHTML('<!---->');
    this.assertStableRerender();

    this.rerender({ foo: 'Updated Fragment!' });
    this.assert.strictEqual(
      fragment.textContent,
      '[Updated Fragment!]',
      'content updated in document fragment'
    );
    this.assertHTML('<!---->');

    this.rerender({ foo: 'Hello Fragment!' });
    this.assert.strictEqual(
      fragment.textContent,
      '[Hello Fragment!]',
      'content reverted in fragment'
    );
    this.assertHTML('<!---->');
  }

  @test
  'Class-based component with tracked property renders into shadow root without full DOM replacement on update'() {
    if (!hasShadowDom()) {
      this.assert.ok(true, 'Shadow DOM not supported, skipping');
      return;
    }

    const hostElement = document.createElement('div');
    const shadowRoot = hostElement.attachShadow({ mode: 'open' });

    class Counter extends GlimmerishComponent {
      @tracked count: number;

      constructor(owner: Owner, args: Dict) {
        super(owner, args);
        this.count = (args['initial'] as number) ?? 0;
      }
    }

    this.registerComponent('Glimmer', 'Counter', '<p>Count: {{@count}}</p>', Counter as any);

    this.render('{{#in-element this.shadowRoot}}<Counter @count={{this.count}} />{{/in-element}}', {
      shadowRoot,
      count: 0,
    });

    const p = shadowRoot.querySelector('p');
    this.assert.ok(p !== null, 'p element rendered in shadow root');
    this.assert.strictEqual(p?.textContent, 'Count: 0', 'initial count is 0');
    this.assertHTML('<!---->');

    this.rerender({ count: 1 });
    this.assert.strictEqual(
      shadowRoot.querySelector('p')?.textContent,
      'Count: 1',
      'count updated to 1'
    );
    this.assert.strictEqual(
      shadowRoot.querySelector('p'),
      p,
      'same <p> element reused (no full DOM replacement)'
    );
    this.assertHTML('<!---->');

    this.rerender({ count: 42 });
    this.assert.strictEqual(
      shadowRoot.querySelector('p')?.textContent,
      'Count: 42',
      'count updated to 42'
    );
    this.assert.strictEqual(
      shadowRoot.querySelector('p'),
      p,
      'same <p> element still reused after second update'
    );
    this.assertHTML('<!---->');
  }

  @test
  'Sibling components rendered into the same shadow root'() {
    if (!hasShadowDom()) {
      this.assert.ok(true, 'Shadow DOM not supported, skipping');
      return;
    }

    const hostElement = document.createElement('div');
    const shadowRoot = hostElement.attachShadow({ mode: 'open' });

    this.registerComponent('TemplateOnly', 'Header', '<h1>{{@title}}</h1>');
    this.registerComponent('TemplateOnly', 'Body', '<p>{{@content}}</p>');

    this.render(
      '{{#in-element this.shadowRoot insertBefore=null}}<Header @title={{this.title}} />{{/in-element}}' +
        '{{#in-element this.shadowRoot insertBefore=null}}<Body @content={{this.content}} />{{/in-element}}',
      {
        shadowRoot,
        title: 'My Title',
        content: 'My Content',
      }
    );

    this.assert.strictEqual(
      shadowRoot.querySelector('h1')?.textContent,
      'My Title',
      'Header component rendered in shadow root'
    );
    this.assert.strictEqual(
      shadowRoot.querySelector('p')?.textContent,
      'My Content',
      'Body component rendered in shadow root'
    );
    this.assertHTML('<!----><!---->');
    this.assertStableRerender();

    this.rerender({ title: 'Updated Title', content: 'Updated Content' });
    this.assert.strictEqual(
      shadowRoot.querySelector('h1')?.textContent,
      'Updated Title',
      'Header updated'
    );
    this.assert.strictEqual(
      shadowRoot.querySelector('p')?.textContent,
      'Updated Content',
      'Body updated'
    );
    this.assertHTML('<!----><!---->');
  }

  @test
  'Sibling shadow roots each receive their own component'() {
    if (!hasShadowDom()) {
      this.assert.ok(true, 'Shadow DOM not supported, skipping');
      return;
    }

    const host1 = document.createElement('div');
    const shadow1 = host1.attachShadow({ mode: 'open' });
    const host2 = document.createElement('div');
    const shadow2 = host2.attachShadow({ mode: 'open' });

    this.registerComponent('TemplateOnly', 'Widget', '<span>{{@label}}</span>');

    this.render(
      '{{#in-element this.shadow1}}<Widget @label={{this.label1}} />{{/in-element}}' +
        '{{#in-element this.shadow2}}<Widget @label={{this.label2}} />{{/in-element}}',
      {
        shadow1,
        shadow2,
        label1: 'Widget A',
        label2: 'Widget B',
      }
    );

    this.assert.strictEqual(
      shadow1.querySelector('span')?.textContent,
      'Widget A',
      'Widget A rendered in shadow1'
    );
    this.assert.strictEqual(
      shadow2.querySelector('span')?.textContent,
      'Widget B',
      'Widget B rendered in shadow2'
    );
    this.assertHTML('<!----><!---->');
    this.assertStableRerender();

    this.rerender({ label1: 'Widget Alpha', label2: 'Widget Beta' });
    this.assert.strictEqual(
      shadow1.querySelector('span')?.textContent,
      'Widget Alpha',
      'Widget A label updated'
    );
    this.assert.strictEqual(
      shadow2.querySelector('span')?.textContent,
      'Widget Beta',
      'Widget B label updated'
    );
    this.assertHTML('<!----><!---->');
  }

  @test
  'Multiple in-element calls to the same shadow root'() {
    if (!hasShadowDom()) {
      this.assert.ok(true, 'Shadow DOM not supported, skipping');
      return;
    }

    const hostElement = document.createElement('div');
    const shadowRoot = hostElement.attachShadow({ mode: 'open' });

    // Without insertBefore=null, each in-element block manages its own bounded
    // region inside the shadow root using comment markers.
    this.render(
      '{{#in-element this.shadowRoot}}[{{this.foo}}]{{/in-element}}' +
        '{{#in-element this.shadowRoot insertBefore=null}}[{{this.bar}}]{{/in-element}}',
      {
        shadowRoot,
        foo: 'first',
        bar: 'second',
      }
    );

    this.assert.ok(shadowRoot.textContent?.includes('[first]'), 'first in-element content present');
    this.assert.ok(
      shadowRoot.textContent?.includes('[second]'),
      'second in-element content present'
    );
    this.assertHTML('<!----><!---->');
    this.assertStableRerender();

    this.rerender({ foo: 'updated-first', bar: 'updated-second' });
    this.assert.ok(
      shadowRoot.textContent?.includes('[updated-first]'),
      'first in-element content updated'
    );
    this.assert.ok(
      shadowRoot.textContent?.includes('[updated-second]'),
      'second in-element content updated'
    );
    this.assertHTML('<!----><!---->');
  }

  @test
  'Multiple in-element calls to the same shadow root with insertBefore=null'() {
    if (!hasShadowDom()) {
      this.assert.ok(true, 'Shadow DOM not supported, skipping');
      return;
    }

    const hostElement = document.createElement('div');
    const shadowRoot = hostElement.attachShadow({ mode: 'open' });

    // With insertBefore=null on both, both blocks append to the shadow root
    this.render(
      '{{#in-element this.shadowRoot insertBefore=null}}<p id="a">{{this.foo}}</p>{{/in-element}}' +
        '{{#in-element this.shadowRoot insertBefore=null}}<p id="b">{{this.bar}}</p>{{/in-element}}',
      {
        shadowRoot,
        foo: 'first',
        bar: 'second',
      }
    );

    this.assert.strictEqual(
      shadowRoot.querySelector('#a')?.textContent,
      'first',
      'first block appended to shadow root'
    );
    this.assert.strictEqual(
      shadowRoot.querySelector('#b')?.textContent,
      'second',
      'second block appended to shadow root'
    );
    this.assertHTML('<!----><!---->');
    this.assertStableRerender();

    this.rerender({ foo: 'updated-first', bar: 'updated-second' });
    this.assert.strictEqual(
      shadowRoot.querySelector('#a')?.textContent,
      'updated-first',
      'first block updated'
    );
    this.assert.strictEqual(
      shadowRoot.querySelector('#b')?.textContent,
      'updated-second',
      'second block updated'
    );
    this.assertHTML('<!----><!---->');
  }
}
