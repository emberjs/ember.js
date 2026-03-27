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
  'After fragment is attached to DOM, text updates and new conditional elements appear in the container'() {
    const fragment = document.createDocumentFragment();
    const container = document.createElement('div');
    const step = (text: string) => this.assert.step(text);

    this.render(
      '{{#in-element this.fragment}}' +
        '<p id="msg">{{this.message}} {{this.step "message rendered"}}</p>' +
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

    this.assert.verifySteps(['message rendered'], 'initial render fires step from inside fragment');

    // Move fragment's children (including Glimmer's comment bounds) into the container
    container.appendChild(fragment);
    this.assert.strictEqual(fragment.childNodes.length, 0, 'fragment is empty after append');

    // Text-node update: Glimmer holds a direct reference to the text node, so the
    // update is visible in the container even though the fragment is now empty.
    this.rerender({ message: 'updated' });
    this.assert.verifySteps(
      ['message rendered'],
      'text update fires step even after fragment was attached to the DOM'
    );

    // New-element update: Glimmer inserts the span relative to the comment bounds,
    // which also moved to the container, so the new element appears in the container.
    this.rerender({ show: true });
    this.assert.verifySteps(
      ['message rendered', 'extra rendered'],
      'new conditional element fires step in the container after fragment was attached to the DOM'
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
