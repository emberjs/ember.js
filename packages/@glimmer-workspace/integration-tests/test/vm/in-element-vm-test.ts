/**
 * VM-level in-element tests, compiled with plain Glimmer options (no Ember `compileOptions`).
 *
 * Ember's template language does not expose these capabilities: `transform-in-element` rejects a
 * non-null `insertBefore` (03-static-semantics §03-7.9) and, in development builds, wraps the
 * destination in `-in-el-null`, which asserts on a null or undefined destination (§08-2.17).
 * The VM still supports both (and Ember production builds keep "a null destination renders
 * nothing"), so these are implementation tests (W5), not conformance tests. The Ember side is
 * pinned by `@ember/-internals/glimmer/tests/integration/syntax/public-in-element-test.js`
 * ("does not allow insertBefore=non-null-value", "does not allow null as a destination
 * element", "does not undefined as a destination element").
 */
import type { Dict, Nullable, SimpleElement } from '@glimmer/interfaces';
import {
  assertingElement,
  assertSerializedInElement,
  blockStack,
  equalsElement,
  PlainGlimmerJitDelegate,
  PlainGlimmerRehydrationDelegate,
  RenderTest,
  replaceHTML,
  strip,
  stripTight,
  suite,
  test,
  toInnerHTML,
  trackedContext,
} from '@glimmer-workspace/integration-tests';

class InElementVmTests extends RenderTest {
  static suiteName = '#in-element (VM)';

  @test
  'Changing to falsey'() {
    let first = this.delegate.createElement('div');
    let second = this.delegate.createElement('div');

    this.render(
      stripTight`
        |{{this.foo}}|
        {{#in-element this.first}}[1{{this.foo}}]{{/in-element}}
        {{#in-element this.second}}[2{{this.foo}}]{{/in-element}}
      `,
      { first, second: null, foo: 'Yippie!' }
    );

    equalsElement(first, 'div', {}, '[1Yippie!]');
    equalsElement(second, 'div', {}, '');
    this.assertHTML('|Yippie!|<!----><!---->');
    this.assertStableRerender();

    this.rerender({ foo: 'Double Yips!' });
    equalsElement(first, 'div', {}, '[1Double Yips!]');
    equalsElement(second, 'div', {}, '');
    this.assertHTML('|Double Yips!|<!----><!---->');
    this.assertStableNodes();

    this.rerender({ first: null });
    equalsElement(first, 'div', {}, '');
    equalsElement(second, 'div', {}, '');
    this.assertHTML('|Double Yips!|<!----><!---->');
    this.assertStableRerender();

    this.rerender({ second });
    equalsElement(first, 'div', {}, '');
    equalsElement(second, 'div', {}, '[2Double Yips!]');
    this.assertHTML('|Double Yips!|<!----><!---->');
    this.assertStableRerender();

    this.rerender({ first, second: null, foo: 'Yippie!' });
    equalsElement(first, 'div', {}, '[1Yippie!]');
    equalsElement(second, 'div', {}, '');
    this.assertHTML('|Yippie!|<!----><!---->');
    this.assertStableRerender();
  }

  @test
  'With pre-existing content'() {
    let externalElement = this.delegate.createElement('div');
    let initialContent = '<p>Hello there!</p>';
    replaceHTML(externalElement, initialContent);

    this.render(
      stripTight`{{#in-element this.externalElement insertBefore=null}}[{{this.foo}}]{{/in-element}}`,
      {
        externalElement,
        foo: 'Yippie!',
      }
    );

    equalsElement(externalElement, 'div', {}, `${initialContent}[Yippie!]`);
    this.assertHTML('<!---->');
    this.assertStableRerender();

    this.rerender({ foo: 'Double Yips!' });
    equalsElement(externalElement, 'div', {}, `${initialContent}[Double Yips!]`);
    this.assertHTML('<!---->');
    this.assertStableNodes();

    this.rerender({ externalElement: null });
    equalsElement(externalElement, 'div', {}, initialContent);
    this.assertHTML('<!---->');
    this.assertStableRerender();

    this.rerender({ externalElement, foo: 'Yippie!' });
    equalsElement(externalElement, 'div', {}, `${initialContent}[Yippie!]`);
    this.assertHTML('<!---->');
    this.assertStableRerender();
  }

  @test
  'With insertBefore'() {
    let externalElement = this.delegate.createElement('div');
    replaceHTML(externalElement, '<b>Hello</b><em>there!</em>');

    this.render(
      stripTight`{{#in-element this.externalElement insertBefore=this.insertBefore}}[{{this.foo}}]{{/in-element}}`,
      { externalElement, insertBefore: externalElement.lastChild, foo: 'Yippie!' }
    );

    equalsElement(externalElement, 'div', {}, '<b>Hello</b>[Yippie!]<em>there!</em>');
    this.assertHTML('<!---->');
    this.assertStableRerender();

    this.rerender({ foo: 'Double Yips!' });
    equalsElement(externalElement, 'div', {}, '<b>Hello</b>[Double Yips!]<em>there!</em>');
    this.assertHTML('<!---->');
    this.assertStableNodes();

    this.rerender({ insertBefore: null });
    equalsElement(externalElement, 'div', {}, '<b>Hello</b><em>there!</em>[Double Yips!]');
    this.assertHTML('<!---->');
    this.assertStableRerender();

    this.rerender({ externalElement: null });
    equalsElement(externalElement, 'div', {}, '<b>Hello</b><em>there!</em>');
    this.assertHTML('<!---->');
    this.assertStableRerender();

    this.rerender({ externalElement, insertBefore: externalElement.lastChild, foo: 'Yippie!' });
    equalsElement(externalElement, 'div', {}, '<b>Hello</b>[Yippie!]<em>there!</em>');
    this.assertHTML('<!---->');
    this.assertStableRerender();
  }
}

class InElementVmRehydrationTests extends RenderTest {
  static suiteName = '#in-element rehydration (VM)';

  declare protected delegate: PlainGlimmerRehydrationDelegate;
  declare protected serverOutput: Nullable<string>;

  renderServerSide(
    template: string,
    context: Dict,
    element: SimpleElement | undefined = undefined
  ) {
    this.serverOutput = this.delegate.renderServerSide(
      template,
      trackedContext(context),
      () => this.takeSnapshot(),
      element
    );
    replaceHTML(this.element, this.serverOutput);
  }

  renderClientSide(template: string, context: Dict): void {
    this.context = trackedContext(context);
    this.handle = this.delegate.renderClientSide(template, this.context, this.element);
  }

  assertRehydrationStats({ nodesRemoved: nodes }: { nodesRemoved: number }) {
    let { clearedNodes } = this.delegate.rehydrationStats;
    this.assert.strictEqual(clearedNodes.length, nodes, 'cleared nodes');
  }

  @test
  'in-element with insertBefore=element can rehydrate'() {
    let template = strip`
      <outer><prefix></prefix>
      {{#in-element this.remote insertBefore=this.prefix}}<inner>Wat Wat</inner>{{/in-element}}
      <suffix></suffix></outer>
      `;
    let doc = this.delegate.serverDoc;
    let remote = doc.createElement('remote');
    let prefix = doc.createElement('prefix');
    let suffix = doc.createElement('suffix');
    remote.appendChild(prefix);
    remote.appendChild(suffix);

    this.renderServerSide(template, { remote, prefix, suffix });
    let serializedRemote = this.delegate.serialize(remote);
    let b = blockStack();
    assertSerializedInElement(
      serializedRemote,
      strip`
      ${b(2)}
      <inner>Wat Wat</inner>
      ${b(2)}
      <prefix></prefix>
      <suffix></suffix>
    `
    );

    doc = this.delegate.clientDoc;
    let clientRemote = (remote = doc.createElement('remote'));
    let host = doc.createElement('div');
    host.appendChild(this.element);
    host.appendChild(clientRemote);
    replaceHTML(clientRemote, serializedRemote);
    this.element = assertingElement(host.firstChild);
    let clientPrefix = clientRemote.childNodes[4];

    this.renderClientSide(template, { remote: clientRemote, prefix: clientPrefix });
    this.assertRehydrationStats({ nodesRemoved: 0 });
    this.assert.strictEqual(
      toInnerHTML(clientRemote),
      '<inner>Wat Wat</inner><prefix></prefix><suffix></suffix>'
    );
  }

  @test
  'in-element with insertBefore=element can rehydrate into pre-existing content'() {
    let template = strip`
      <outer>
      {{#in-element this.remote insertBefore=this.preexisting}}<inner>Wat Wat</inner>{{/in-element}}
      </outer>
      `;
    let doc = this.delegate.serverDoc;
    let remote = doc.createElement('remote');
    let prefix = doc.createElement('prefix');
    let preexisting = doc.createElement('preexisting');
    remote.appendChild(prefix);
    remote.appendChild(preexisting);

    this.renderServerSide(template, { remote, prefix, preexisting });
    let serializedRemote = '<prefix></prefix><preexisting></preexisting>';

    doc = this.delegate.clientDoc;
    let clientRemote = (remote = doc.createElement('remote'));
    let host = doc.createElement('div');
    host.appendChild(this.element);
    host.appendChild(clientRemote);
    replaceHTML(clientRemote, serializedRemote);
    let clientPreexisting = clientRemote.childNodes[1];
    this.element = assertingElement(host.firstChild);

    this.renderClientSide(template, {
      remote: clientRemote,
      prefix,
      preexisting: clientPreexisting,
    });
    this.assertRehydrationStats({ nodesRemoved: 0 });
    this.assert.strictEqual(
      toInnerHTML(clientRemote),
      '<prefix></prefix><inner>Wat Wat</inner><preexisting></preexisting>'
    );
  }
}

suite(InElementVmTests, PlainGlimmerJitDelegate);
suite(InElementVmRehydrationTests, PlainGlimmerRehydrationDelegate);
