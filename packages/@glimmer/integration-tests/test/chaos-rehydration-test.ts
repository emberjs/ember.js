import { Dict, Option } from '@glimmer/interfaces';
import {
  OPEN,
  CLOSE,
  equalTokens,
  suite,
  RehydrationDelegate,
  test,
  Content,
  content,
  blockStack,
  ComponentBlueprint,
  replaceHTML,
  RenderTest,
} from '..';
import { expect } from '@glimmer/util';
import { SimpleElement, NodeType } from '@simple-dom/interface';

// `window.ActiveXObject` is "falsey" in IE11 (but not `undefined` or `false`)
// `"ActiveXObject" in window` returns `true` in all IE versions
// only IE11 will pass _both_ of these conditions
const isIE11 = !(window as any).ActiveXObject && 'ActiveXObject' in window;

class ChaosMonkeyRehydration extends RenderTest {
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
    let element = this.element as Element;

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

    // cannot remove the first node, that is what makes it rehydrateable
    nodes = nodes.slice(1);

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
        removedNodeDisplay = (nodeToRemove as Element).outerHTML;
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
    let element = this.element as Element;
    let elementResetValue = element.innerHTML;

    let urlParams = (QUnit as any).urlParams as Dict<string>;
    if (urlParams.iteration) {
      // runs a single iteration directly, no try/catch, with logging
      let iteration = parseInt(urlParams.iteration, 10);
      this.wreakHavoc(iteration, true);

      this.renderClientSide(template, context);

      let element = this.element as Element;
      this.assert.equal(element.innerHTML, expectedHTML);
    } else {
      for (let i = 0; i < count; i++) {
        let seed = QUnit.config.seed ? `&seed=${QUnit.config.seed}` : '';
        let rerunUrl = `&testId=${QUnit.config.current.testId}&iteration=${i}${seed}`;

        try {
          this.wreakHavoc(i);

          this.renderClientSide(template, context);

          let element = this.element as Element;
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

suite(ChaosMonkeyRehydration, RehydrationDelegate);
