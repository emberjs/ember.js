import { Dict, Option } from '@glimmer/interfaces';
import { castToBrowser, castToSimple, expect } from '@glimmer/util';
import { NodeType, SimpleElement } from '@simple-dom/interface';
import {
  blockStack,
  CLOSE,
  ComponentBlueprint,
  Content,
  content,
  equalTokens,
  OPEN,
  RehydrationDelegate,
  RenderTest,
  replaceHTML,
  suite,
  test,
  PartialRehydrationDelegate,
  qunitFixture,
} from '..';

// `window.ActiveXObject` is "falsey" in IE11 (but not `undefined` or `false`)
// `"ActiveXObject" in window` returns `true` in all IE versions
// only IE11 will pass _both_ of these conditions
const isIE11 = !(window as any).ActiveXObject && 'ActiveXObject' in window;

abstract class AbstractChaosMonkeyTest extends RenderTest {
  abstract renderClientSide(template: string | ComponentBlueprint, context: Dict<unknown>): void;

  getRandomForIteration(iteration: number) {
    const { seed } = QUnit.config;

    const str = iteration + '\x1C' + seed;

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

    let result = hex.slice(-8);
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
    let element = castToBrowser(this.element, 'HTML');

    let original = element.innerHTML;

    function collectChildNodes(childNodes: Node[], node: Node): Node[] {
      // do some thing with the node here
      let children = node.childNodes;
      for (let i = 0; i < children.length; i++) {
        let child = children[i];
        childNodes.push(child);

        collectChildNodes(childNodes, child);
      }

      return childNodes;
    }

    // gather all the nodes recursively
    let nodes: Node[] = collectChildNodes([], element);

    // cannot remove the first opening block node and last closing block node, that is what makes it rehydrateable
    nodes = nodes.slice(1, -1);

    // select a random node to remove
    let indexToRemove = Math.floor(this.getRandomForIteration(iteration) * nodes.length);
    let nodeToRemove = nodes[indexToRemove];
    let parent = nodeToRemove.parentNode!;

    // remove it
    parent.removeChild(nodeToRemove);

    let removedNodeDisplay;
    switch (nodeToRemove.nodeType) {
      case NodeType.COMMENT_NODE:
        removedNodeDisplay = `<!--${nodeToRemove.nodeValue}-->`;
        break;
      case NodeType.ELEMENT_NODE:
        removedNodeDisplay = castToBrowser(nodeToRemove, ['HTML', 'SVG']).outerHTML;
        break;
      default:
        removedNodeDisplay = nodeToRemove.nodeValue;
    }

    if (shouldLog) {
      console.log(
        `${removedNodeDisplay} was removed;\noriginal: ${original}\nupdated:  ${element.innerHTML}`
      );
    }

    this.assert.notEqual(
      original,
      element.innerHTML,
      `\`${removedNodeDisplay}\` was removed from \`${original}\``
    );
  }

  runIterations(template: string, context: Dict<unknown>, expectedHTML: string, count: number) {
    let element = castToBrowser(this.element, 'HTML');
    let elementResetValue = element.innerHTML;

    let urlParams = (QUnit as any).urlParams as Dict<string>;
    if (urlParams.iteration) {
      // runs a single iteration directly, no try/catch, with logging
      let iteration = parseInt(urlParams.iteration, 10);
      this.wreakHavoc(iteration, true);

      this.renderClientSide(template, context);

      let element = castToBrowser(this.element, 'HTML');
      this.assert.equal(element.innerHTML, expectedHTML);
    } else {
      for (let i = 0; i < count; i++) {
        let seed = QUnit.config.seed ? `&seed=${QUnit.config.seed}` : '';
        let rerunUrl = `&testId=${QUnit.config.current.testId}&iteration=${i}${seed}`;

        try {
          this.wreakHavoc(i);

          this.renderClientSide(template, context);

          let element = castToBrowser(this.element, 'HTML');
          this.assert.equal(
            element.innerHTML,
            expectedHTML,
            `should match after iteration ${i}; rerun with these query params: '${rerunUrl}'`
          );
        } catch (error) {
          this.assert.pushResult({
            result: false,
            actual: error.message,
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

class ChaosMonkeyRehydration extends AbstractChaosMonkeyTest {
  static suiteName = 'chaos-rehydration';

  protected delegate!: RehydrationDelegate;
  protected serverOutput!: Option<string>;

  renderServerSide(
    template: string | ComponentBlueprint,
    context: Dict<unknown>,
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

  renderClientSide(template: string | ComponentBlueprint, context: Dict<unknown>): void {
    this.context = context;
    this.renderResult = this.delegate.renderClientSide(template as string, context, this.element);
  }

  assertExactServerOutput(_expected: string) {
    let output = expect(
      this.serverOutput,
      'must renderServerSide before calling assertServerOutput'
    );
    equalTokens(output, _expected);
  }

  assertServerOutput(..._expected: Content[]) {
    this.assertExactServerOutput(content([OPEN, ..._expected, CLOSE]));
  }

  @test
  'adjacent text nodes'() {
    let template = '<div>a {{b}}{{c}}{{d}}</div>';
    let context = { b: '', c: '', d: '' };

    this.renderServerSide(template, context);

    let b = blockStack();
    this.assertServerOutput(
      `<div>a ${b(1)}<!--% %-->${b(1)}${b(1)}<!--% %-->${b(1)}${b(1)}<!--% %-->${b(1)}</div>`
    );

    this.runIterations(template, context, '<div>a </div>', 100);
  }

  @test
  '<p> invoking a block which emits a <div>'() {
    let template = '<p>hello {{#if show}}<div>world!</div>{{/if}}</p>';
    let context = { show: true };

    this.renderServerSide(template, context);
    let b = blockStack();

    // assert that we are in a "browser corrected" state (note the `</p>` before the `<div>world!</div>`)
    if (isIE11) {
      // IE11 doesn't behave the same as modern browsers
      this.assertServerOutput(`<p>hello ${b(1)}<div>world!</div>${b(1)}<p></p>`);
    } else {
      this.assertServerOutput(`<p>hello ${b(1)}</p><div>world!</div>${b(1)}<p></p>`);
    }

    this.runIterations(template, context, '<p>hello <div>world!</div></p>', 100);
  }
}

class ChaosMonkeyPartialRehydration extends AbstractChaosMonkeyTest {
  static suiteName = 'chaos-partial-rehydration';
  protected delegate!: PartialRehydrationDelegate;

  renderClientSide(componentName: string, args: Dict<unknown>): void {
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

    this.assert.equal(
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
    this.assert.equal(
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

suite(ChaosMonkeyRehydration, RehydrationDelegate);
suite(ChaosMonkeyPartialRehydration, PartialRehydrationDelegate);
