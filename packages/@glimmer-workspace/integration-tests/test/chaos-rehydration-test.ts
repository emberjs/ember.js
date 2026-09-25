import type { Dict, Nullable, SimpleElement } from '@glimmer/interfaces';
import type { ComponentBlueprint, Content } from '@glimmer-workspace/integration-tests';
import { castToBrowser, castToSimple, expect } from '@glimmer/debug-util';
import { on, renderComponent, renderSync } from '@glimmer/runtime';
import { isIndexable, LOCAL_LOGGER } from '@glimmer/util';
import {
  blockStack,
  CLOSE,
  content,
  defineComponent,
  equalTokens,
  GlimmerishComponent,
  OPEN,
  PartialRehydrationDelegate,
  qunitFixture,
  RehydrationDelegate,
  RenderTest,
  replaceHTML,
  suite,
  test,
  tracked,
} from '@glimmer-workspace/integration-tests';

abstract class AbstractChaosMonkeyTest extends RenderTest {
  abstract renderClientSide(template: string | object, context: Dict): void;

  getRandomForIteration(iteration: number) {
    const { seed } = QUnit.config;

    const str = `${iteration}\x1C${seed}`;

    // from https://github.com/qunitjs/qunit/blob/2.9.3/src/core/utilities.js#L144-L158
    let hash = 0;

    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }

    let hex = (0x100000000 + hash).toString(16);
    if (hex.length < 8) {
      hex = '0000000' + hex;
    }

    const result = hex.slice(-8);
    let sample = parseInt(result, 16) || -1;

    // from https://github.com/qunitjs/qunit/blob/2.9.3/src/core/processing-queue.js#L134-L154
    sample ^= sample << 13;
    sample ^= sample >>> 17;
    sample ^= sample << 5;

    if (sample < 0) {
      sample += 0x100000000;
    }

    return sample / 0x100000000;
  }

  wreakHavoc(iteration = 0, shouldLog = false) {
    const element = castToBrowser(this.element, 'HTML');

    const original = element.innerHTML;

    function collectChildNodes(childNodes: Node[], node: Node): Node[] {
      // do some thing with the node here

      node.childNodes.forEach((child) => {
        childNodes.push(child);

        collectChildNodes(childNodes, child);
      });

      return childNodes;
    }

    // gather all the nodes recursively
    let nodes: Node[] = collectChildNodes([], element);

    // cannot remove the first opening block node and last closing block node, that is what makes it rehydrateable
    nodes = nodes.slice(1, -1);

    // select a random node to remove
    const indexToRemove = Math.floor(this.getRandomForIteration(iteration) * nodes.length);

    const nodeToRemove = this.guardPresent({ 'node to remove': nodes[indexToRemove] });
    const parent = this.guardPresent({ 'parent node': nodeToRemove.parentNode });

    // remove it
    parent.removeChild(nodeToRemove);

    let removedNodeDisplay: Nullable<string>;
    switch (nodeToRemove.nodeType) {
      case 8 satisfies typeof Node.COMMENT_NODE:
        removedNodeDisplay = `<!--${nodeToRemove.nodeValue}-->`;
        break;

      case 1 satisfies typeof Node.ELEMENT_NODE:
        removedNodeDisplay = castToBrowser(nodeToRemove, ['HTML', 'SVG']).outerHTML;
        break;
      default:
        removedNodeDisplay = nodeToRemove.nodeValue;
    }

    if (shouldLog) {
      LOCAL_LOGGER.debug(
        `${removedNodeDisplay} was removed;\noriginal: ${original}\nupdated:  ${element.innerHTML}`
      );
    }

    this.assert.notEqual(
      original,
      element.innerHTML,
      `\`${removedNodeDisplay}\` was removed from \`${original}\``
    );
  }

  runIterations(
    template: string | object,
    context: Dict,
    expectedHTML: string,
    count: number,
    afterRehydration: () => void = () => {}
  ) {
    const element = castToBrowser(this.element, 'HTML');
    const elementResetValue = element.innerHTML;

    const urlParams = (QUnit as any).urlParams as Dict<string>;
    if (urlParams['iteration']) {
      // runs a single iteration directly, no try/catch, with logging
      const iteration = parseInt(urlParams['iteration'], 10);
      this.wreakHavoc(iteration, true);

      this.renderClientSide(template, context);

      const element = castToBrowser(this.element, 'HTML');
      this.assert.strictEqual(element.innerHTML, expectedHTML);

      afterRehydration();
    } else {
      for (let i = 0; i < count; i++) {
        const seed = QUnit.config.seed ? `&seed=${QUnit.config.seed}` : '';
        const rerunUrl = `&testId=${QUnit.config.current.testId}&iteration=${i}${seed}`;

        try {
          this.wreakHavoc(i);

          this.renderClientSide(template, context);

          const element = castToBrowser(this.element, 'HTML');
          this.assert.strictEqual(
            element.innerHTML,
            expectedHTML,
            `should match after iteration ${i}; rerun with these query params: '${rerunUrl}'`
          );

          afterRehydration();
        } catch (error) {
          this.assert.pushResult({
            result: false,
            actual: getErrorMessage(this.assert, error),
            expected: undefined,
            message: `Error occurred during iteration ${i}; rerun with these query params: ${rerunUrl}`,
          });

          throw error;
        } finally {
          // reset the HTML
          element.innerHTML = elementResetValue;
        }
      }
    }
  }
}

function getErrorMessage(assert: Assert, error: unknown): string {
  if (isIndexable(error) && 'message' in error && typeof error.message === 'string') {
    return error.message;
  } else {
    assert.pushResult({
      result: false,
      expected: `an error with a 'message' property`,
      actual: error,
      message: `unexpectedly, error.message did not exist`,
    });
    return '';
  }
}

abstract class AbstractChaosMonkeyRehydration extends AbstractChaosMonkeyTest {
  declare protected delegate: RehydrationDelegate;
  declare protected serverOutput: Nullable<string>;

  assertExactServerOutput(_expected: string) {
    const output = expect(
      this.serverOutput,
      'must renderServerSide before calling assertServerOutput'
    );
    equalTokens(output, _expected);
  }

  assertServerOutput(..._expected: Content[]) {
    this.assertExactServerOutput(content([OPEN, ..._expected, CLOSE]));
  }
}

class ChaosMonkeyRehydration extends AbstractChaosMonkeyRehydration {
  static suiteName = 'chaos-rehydration';

  renderServerSide(
    template: string | ComponentBlueprint,
    context: Dict,
    element: SimpleElement | undefined = undefined
  ): void {
    this.serverOutput = this.delegate.renderServerSide(
      template as string,
      context,
      () => this.takeSnapshot(),
      element
    );
    replaceHTML(this.element, this.serverOutput);
  }

  renderClientSide(template: string | ComponentBlueprint, context: Dict): void {
    this.context = context;
    this.renderResult = this.delegate.renderClientSide(template as string, context, this.element);
  }

  @test
  'adjacent text nodes'() {
    const template = '<div>a {{this.b}}{{this.c}}{{this.d}}</div>';
    const context = { b: '', c: '', d: '' };

    this.renderServerSide(template, context);

    const b = blockStack();
    this.assertServerOutput(
      `<div>a ${b(1)}<!--% %-->${b(1)}${b(1)}<!--% %-->${b(1)}${b(1)}<!--% %-->${b(1)}</div>`
    );

    this.runIterations(template, context, '<div>a </div>', 100);
  }

  @test
  '<p> invoking a block which emits a <div>'() {
    const template = '<p>hello {{#if this.show}}<div>world!</div>{{/if}}</p>';
    const context = { show: true };

    this.renderServerSide(template, context);
    const b = blockStack();

    // assert that we are in a "browser corrected" state (note the `</p>` before the `<div>world!</div>`)
    this.assertServerOutput(`<p>hello ${b(1)}</p><div>world!</div>${b(1)}<p></p>`);
    this.runIterations(template, context, '<p>hello <div>world!</div></p>', 100);
  }
}

class ChaosMonkeyPartialRehydration extends AbstractChaosMonkeyTest {
  static suiteName = 'chaos-partial-rehydration';
  declare protected delegate: PartialRehydrationDelegate;

  renderClientSide(componentName: string, args: Dict): void {
    this.renderResult = this.delegate.renderComponentClientSide(componentName, args, this.element);
  }

  @test
  'adjacent text nodes'() {
    const args = { b: 'b', c: 'c', d: 'd' };

    this.delegate.registerTemplateOnlyComponent('RehydratingComponent', 'a {{@b}}{{@c}}{{@d}}');
    this.delegate.registerTemplateOnlyComponent(
      'Root',
      '<div><RehydratingComponent @b={{@b}} @c={{@c}} @d={{@d}}/></div>'
    );
    const html = this.delegate.renderComponentServerSide('Root', args);

    this.assert.strictEqual(
      html,
      content([
        OPEN,
        OPEN,
        '<div>',
        OPEN,
        'a ',
        OPEN,
        'b',
        CLOSE,
        OPEN,
        'c',
        CLOSE,
        OPEN,
        'd',
        CLOSE,
        CLOSE,
        '</div>',
        CLOSE,
        CLOSE,
      ]),
      'server html is correct'
    );
    replaceHTML(qunitFixture(), html);
    this.element = castToSimple(castToBrowser(qunitFixture(), 'HTML').querySelector('div')!);
    this.runIterations('RehydratingComponent', args, 'a bcd', 100);
  }

  @test
  '<p> invoking a block which emits a <div>'() {
    const args = { show: true };

    this.delegate.registerTemplateOnlyComponent(
      'RehydratingComponent',
      '<p>hello {{#if @show}}<div>world!</div>{{/if}}</p>'
    );

    this.delegate.registerTemplateOnlyComponent(
      'Root',
      '<div><RehydratingComponent @show={{@show}}/></div>'
    );
    const html = this.delegate.renderComponentServerSide('Root', args);
    this.assert.strictEqual(
      html,
      content([
        OPEN,
        OPEN,
        '<div>',
        OPEN,
        '<p>hello ',
        OPEN,
        '<div>world!</div>',
        CLOSE,
        '</p>',
        CLOSE,
        '</div>',
        CLOSE,
        CLOSE,
      ])
    );

    replaceHTML(qunitFixture(), html);
    this.element = castToSimple(castToBrowser(qunitFixture(), 'HTML').querySelector('div')!);
    this.runIterations('RehydratingComponent', args, '<p>hello <div>world!</div></p>', 100);
  }
}

class ChaosMonkeyDocumentFragmentRehydration extends AbstractChaosMonkeyRehydration {
  static suiteName = 'chaos-rehydration (DocumentFragment)';

  /**
   * Rendering a fragment moves its children into the DOM and leaves it empty,
   * so every render (server or client) gets a fresh fragment from its own
   * document as `@fragment`. The content comes from `{{#in-element}}`.
   */
  renderServerSide(component: object, args: Dict): void {
    const { serverContext: context, serverDoc: doc } = this.delegate;
    const element = doc.createElement('div');
    const builder = this.delegate.getElementBuilder(context.env, { element, nextSibling: null });
    const iterator = renderComponent(context, builder, {}, component, {
      ...args,
      fragment: doc.createDocumentFragment(),
    });

    renderSync(context.env, iterator);

    this.serverOutput = this.delegate.serialize(element);
    replaceHTML(this.element, this.serverOutput);
  }

  renderClientSide(component: object, args: Dict): void {
    const { clientContext: context, clientDoc: doc } = this.delegate;
    const builder = this.delegate.getElementBuilder(context.env, {
      element: this.element,
      nextSibling: null,
    });
    const iterator = renderComponent(context, builder, {}, component, {
      ...args,
      fragment: doc.createDocumentFragment(),
    });

    this.renderResult = renderSync(context.env, iterator);
  }

  @test
  'static content'() {
    const Static = defineComponent(
      {},
      '<div>{{@fragment}}</div>{{#in-element @fragment}}<p>one</p><p>two</p>{{/in-element}}'
    );

    this.renderServerSide(Static, {});

    const b = blockStack();
    this.assertServerOutput(
      `${b(1)}<div>${b(2)}<!--%+f%--><script glmr="%cursor:0%"></script>${b(3)}<p>one</p><p>two</p>${b(3)}<!--%-f%-->${b(2)}</div>${b(2)}<!---->${b(2)}${b(1)}`
    );

    this.runIterations(Static, {}, '<div><!----><p>one</p><p>two</p><!----></div><!---->', 100);
  }

  @test
  'updating content by clicking'() {
    class Clicker extends GlimmerishComponent {
      @tracked count = 0;

      increment = () => this.count++;
    }

    const Component = defineComponent(
      { on },
      '<div>{{@fragment}}</div>' +
        '{{#in-element @fragment}}<button {{on "click" this.increment}}>{{this.count}}</button>{{/in-element}}',
      { definition: Clicker }
    );

    this.renderServerSide(Component, {});

    const b = blockStack();
    this.assertServerOutput(
      `${b(1)}<div>${b(2)}<!--%+f%--><script glmr="%cursor:0%"></script>${b(3)}<button>${b(4)}0${b(4)}</button>${b(3)}<!--%-f%-->${b(2)}</div>${b(2)}<!---->${b(2)}${b(1)}`
    );

    this.runIterations(
      Component,
      {},
      '<div><!----><button>0</button><!----></div><!---->',
      100,
      () => {
        const element = castToBrowser(this.element, 'HTML');

        this.guardPresent({ button: element.querySelector('button') }).click();
        this.rerender();

        this.assert.strictEqual(
          element.innerHTML,
          '<div><!----><button>1</button><!----></div><!---->',
          'the click updated the content in the fragment'
        );
      }
    );
  }
}

suite(ChaosMonkeyRehydration, RehydrationDelegate);
suite(ChaosMonkeyDocumentFragmentRehydration, RehydrationDelegate);
suite(ChaosMonkeyPartialRehydration, PartialRehydrationDelegate);
