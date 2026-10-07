import { RenderTest } from '../render-test';
import { test } from '../test-decorator';

export class InElementDocumentFragmentSuite extends RenderTest {
  static suiteName = '#in-element (DocumentFragment)';

  @test
  'Renders curlies into a detached DocumentFragment'() {
    const fragment = document.createDocumentFragment();

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

    this.rerender({ foo: 'Updated!' });
    this.assert.strictEqual(
      fragment.textContent,
      '[Updated!]',
      'content updated in document fragment'
    );
    this.assertHTML('<!---->');

    this.rerender({ foo: 'Hello Fragment!' });
    this.assert.strictEqual(
      fragment.textContent,
      '[Hello Fragment!]',
      'content reverted in document fragment'
    );
    this.assertHTML('<!---->');
  }

  @test
  'Renders curlies into a template.content fragment'() {
    const templateEl = document.createElement('template');
    const fragment = templateEl.content;

    this.render('{{#in-element this.fragment}}[{{this.foo}}]{{/in-element}}', {
      fragment,
      foo: 'Hello Template Content!',
    });

    this.assert.strictEqual(
      fragment.textContent,
      '[Hello Template Content!]',
      'content rendered in template.content fragment'
    );
    this.assertHTML('<!---->');
    this.assertStableRerender();

    this.rerender({ foo: 'Updated!' });
    this.assert.strictEqual(
      fragment.textContent,
      '[Updated!]',
      'content updated in template.content fragment'
    );
    this.assertHTML('<!---->');

    this.rerender({ foo: 'Hello Template Content!' });
    this.assert.strictEqual(
      fragment.textContent,
      '[Hello Template Content!]',
      'content reverted in template.content fragment'
    );
    this.assertHTML('<!---->');
  }

  @test
  'Renders elements into a fragment that is later attached to the DOM'() {
    const fragment = document.createDocumentFragment();
    const container = document.createElement('div');

    this.render('{{#in-element this.fragment}}<p id="frag-p">{{this.message}}</p>{{/in-element}}', {
      fragment,
      message: 'in fragment',
    });

    this.assert.strictEqual(
      fragment.querySelector('#frag-p')?.textContent,
      'in fragment',
      'content rendered in detached fragment'
    );
    this.assertHTML('<!---->');

    // Attach fragment's children to the DOM
    container.appendChild(fragment);
    this.assert.strictEqual(
      container.querySelector('#frag-p')?.textContent,
      'in fragment',
      'content is in the DOM after fragment is appended'
    );
    // Fragment itself is now empty (children moved to container)
    this.assert.strictEqual(fragment.childNodes.length, 0, 'fragment is empty after append');
  }

  @test
  'Multiple in-element calls to the same DocumentFragment'() {
    const fragment = document.createDocumentFragment();

    this.render(
      '{{#in-element this.fragment}}[{{this.foo}}]{{/in-element}}' +
        '{{#in-element this.fragment insertBefore=null}}[{{this.bar}}]{{/in-element}}',
      {
        fragment,
        foo: 'first',
        bar: 'second',
      }
    );

    this.assert.ok(fragment.textContent?.includes('[first]'), 'first block present in fragment');
    this.assert.ok(fragment.textContent?.includes('[second]'), 'second block present in fragment');
    this.assertHTML('<!----><!---->');
    this.assertStableRerender();

    this.rerender({ foo: 'updated-first', bar: 'updated-second' });
    this.assert.ok(
      fragment.textContent?.includes('[updated-first]'),
      'first block updated in fragment'
    );
    this.assert.ok(
      fragment.textContent?.includes('[updated-second]'),
      'second block updated in fragment'
    );
    this.assertHTML('<!----><!---->');
  }

  @test
  'Rerenders work after DocumentFragment is appended to the DOM'(assert: typeof QUnit.assert) {
    const fragment = document.createDocumentFragment();
    const container = document.createElement('div');
    const step = (text: string) => {
      assert.step(text);
      return text;
    };

    this.render(
      '{{#in-element this.fragment}}' +
        '<p id="msg">{{this.step this.message}}</p>' +
        '{{#if this.show}}' +
        '<span id="extra">extra {{this.step "extra rendered"}}</span>' +
        '{{/if}}' +
        '{{/in-element}}',
      {
        fragment,
        message: 'initial',
        show: false,
        step,
      }
    );

    assert.verifySteps(['initial'], 'initial render fires step from inside fragment');

    // Move the fragment's children into the container. After this the fragment is
    // empty, but the rendered nodes (including Glimmer's bounds markers) are live
    // children of `container`.
    container.appendChild(fragment);
    assert.strictEqual(fragment.childNodes.length, 0, 'fragment is empty after append');
    assert.ok(container.querySelector('#msg'), 'paragraph is present in container after append');

    // Rerenders should continue to work after the fragment is attached — Glimmer
    // resolves the live parent from the bounds markers' actual parentNode.
    this.rerender({ message: 'updated' });
    assert.verifySteps(['updated'], 'text update fires step after fragment was attached to DOM');
    assert.strictEqual(
      container.querySelector('#msg')?.textContent,
      'updated',
      'paragraph text is updated in container'
    );

    // New conditional element should appear in the container.
    this.rerender({ show: true });
    assert.verifySteps(
      ['extra rendered'],
      'conditional element step fires in container after fragment was attached to DOM'
    );
    assert.ok(
      container.querySelector('#extra'),
      'conditional span appears in container after fragment was attached to DOM'
    );
  }

  @test
  'Conditional content follows the fragment after it is attached to the DOM'() {
    const fragment = document.createDocumentFragment();
    const container = document.createElement('div');

    this.render(
      '{{#in-element this.fragment}}' +
        '<p id="stable">stable</p>' +
        '{{#if this.show}}<span id="cond">cond</span>{{/if}}' +
        '{{/in-element}}',
      {
        fragment,
        show: false,
      }
    );

    container.appendChild(fragment);

    // The conditional block was empty at attach time; toggling it on must
    // render the new element into the container (where the surrounding content
    // now lives), not into the now-empty fragment.
    this.rerender({ show: true });
    this.assert.ok(container.querySelector('#cond'), 'conditional element rendered in container');
    this.assert.strictEqual(fragment.childNodes.length, 0, 'nothing was rendered into fragment');
    this.assert.strictEqual(
      container.querySelector('#stable')?.nextSibling?.nodeName,
      'SPAN',
      'conditional element is in position, next to the stable element'
    );

    this.rerender({ show: false });
    this.assert.notOk(container.querySelector('#cond'), 'conditional element removed');
    this.assert.ok(container.querySelector('#stable'), 'stable element remains');
    this.assert.strictEqual(fragment.childNodes.length, 0, 'fragment is still empty');
  }

  @test
  'Destroying {{#in-element}} clears the container after the fragment is attached'() {
    const fragment = document.createDocumentFragment();
    const container = document.createElement('div');

    this.render(
      '{{#if this.showing}}' +
        '{{#in-element this.fragment}}<p id="content">hello</p>{{/in-element}}' +
        '{{/if}}',
      {
        fragment,
        showing: true,
      }
    );

    container.appendChild(fragment);
    this.assert.ok(container.querySelector('#content'), 'content is in container after append');

    // Tearing down the {{#in-element}} must remove the content from wherever it
    // currently lives (the container), not from the stale fragment.
    this.rerender({ showing: false });
    this.assert.notOk(container.querySelector('#content'), 'content removed from container');
    this.assert.strictEqual(container.childNodes.length, 0, 'container is empty after destroy');

    this.rerender({ showing: true });
    this.assert.strictEqual(
      fragment.querySelector('#content')?.textContent,
      'hello',
      'content renders into the fragment again when in-element comes back'
    );
  }

  @test
  '{{#each}} updates follow the content after the fragment is attached'() {
    const fragment = document.createDocumentFragment();
    const container = document.createElement('div');
    const text = (parent: ParentNode) =>
      Array.from(parent.querySelectorAll('span.item'))
        .map((node) => node.textContent)
        .join('');

    this.render(
      '{{#in-element this.fragment}}' +
        '{{#each this.items as |item|}}<span class="item">{{item}}</span>{{/each}}' +
        '{{/in-element}}',
      {
        fragment,
        items: ['a', 'b'],
      }
    );

    this.assert.strictEqual(text(fragment), 'ab', 'initial items rendered into fragment');

    container.appendChild(fragment);

    this.rerender({ items: ['a', 'b', 'c'] });
    this.assert.strictEqual(text(container), 'abc', 'new item appended in container');
    this.assert.strictEqual(fragment.childNodes.length, 0, 'nothing was rendered into fragment');

    this.rerender({ items: ['c', 'b', 'a'] });
    this.assert.strictEqual(text(container), 'cba', 'items reordered in container');
    this.assert.strictEqual(fragment.childNodes.length, 0, 'fragment is still empty');

    this.rerender({ items: ['b'] });
    this.assert.strictEqual(text(container), 'b', 'items removed in container');
  }

  @test
  'Renders into a ShadowRoot (a DocumentFragment subtype)'() {
    const host = document.createElement('div');
    const shadowRoot = host.attachShadow({ mode: 'open' });

    this.render(
      '{{#in-element this.shadowRoot}}<p id="in-shadow">{{this.message}}</p>{{/in-element}}',
      {
        shadowRoot,
        message: 'hello',
      }
    );

    this.assert.strictEqual(
      shadowRoot.querySelector('#in-shadow')?.textContent,
      'hello',
      'content rendered into shadow root'
    );
    this.assertHTML('<!---->');
    this.assertStableRerender();

    this.rerender({ message: 'updated' });
    this.assert.strictEqual(
      shadowRoot.querySelector('#in-shadow')?.textContent,
      'updated',
      'content updated in shadow root'
    );
  }

  @test
  'Multiple in-element calls to the same DocumentFragment with insertBefore=null'() {
    const fragment = document.createDocumentFragment();

    this.render(
      '{{#in-element this.fragment insertBefore=null}}<p id="a">{{this.foo}}</p>{{/in-element}}' +
        '{{#in-element this.fragment insertBefore=null}}<p id="b">{{this.bar}}</p>{{/in-element}}',
      {
        fragment,
        foo: 'first',
        bar: 'second',
      }
    );

    // Use childNodes to traverse the fragment's direct children since glimmer also
    // inserts comment marker nodes alongside the rendered elements.
    const nodes = Array.from(fragment.childNodes);
    const pA = nodes.find((n) => (n as Element).id === 'a') as HTMLElement | undefined;
    const pB = nodes.find((n) => (n as Element).id === 'b') as HTMLElement | undefined;

    this.assert.strictEqual(pA?.textContent, 'first', 'first block appended to fragment');
    this.assert.strictEqual(pB?.textContent, 'second', 'second block appended to fragment');
    this.assertHTML('<!----><!---->');
    this.assertStableRerender();

    this.rerender({ foo: 'updated-first', bar: 'updated-second' });
    this.assert.strictEqual(pA?.textContent, 'updated-first', 'first block updated in fragment');
    this.assert.strictEqual(pB?.textContent, 'updated-second', 'second block updated in fragment');
    this.assertHTML('<!----><!---->');
  }
}
