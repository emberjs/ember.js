import { DOMTreeConstruction, type NodeTokensImpl } from '@glimmer/dom-change-list';
import {
  type Namespace,
  type SimpleDocument,
  type SimpleDocumentFragment,
  type SimpleElement,
} from '@glimmer/interfaces';
import { NS_SVG, NS_XLINK } from '@glimmer/util';
import createDocument from '@simple-dom/document';

import { Builder as TestBuilder, toHTML, toHTMLNS } from './support';
import { module, test, TestCase } from './test-case';

@module('[dom-change-list] DOMTreeConstruction')
export class ChangeListTest extends TestCase {
  // These definitely assigned properties are set in before()
  protected declare document: SimpleDocument;
  protected declare parent: SimpleElement | SimpleDocumentFragment;
  protected declare tree: Builder;
  protected declare construction: DOMTreeConstruction;

  override before() {
    this.document = createDocument();
    this.parent = this.document.createElement('div');
    this.construction = new DOMTreeConstruction();
    this.tree = new Builder(this.construction);
  }

  @test
  appendText() {
    this.tree.appendText('hello world');
    this.shouldEqual('hello world');
  }

  @test
  appendComent() {
    this.tree.appendComment('hello world');
    this.shouldEqual('<!--hello world-->');
  }

  @test
  'openElement and closeElement'() {
    const { tree } = this;

    tree.openElement('span');
    tree.appendText('hello world');
    tree.closeElement();
    tree.openElement('span');
    tree.appendComment('hello world');
    tree.closeElement();

    this.shouldEqual('<span>hello world</span><span><!--hello world--></span>');
  }

  @test
  setAttribute() {
    const { tree } = this;

    tree.openElement('span');
    tree.setAttribute('class', 'chad');
    tree.closeElement();

    this.shouldEqual(`<span class="chad"></span>`);
  }

  @test
  'nested elements'() {
    const { tree } = this;

    tree.openElement('p');
    tree.setAttribute('class', 'chad');
    tree.appendText('hi chad');
    tree.openElement('i');
    tree.appendText(' - ');
    tree.closeElement();
    tree.appendText('it works!');
    tree.closeElement();

    this.shouldEqual(`<p class="chad">hi chad<i> - </i>it works!</p>`);
  }

  @test
  'namespaced elements'() {
    const { tree } = this;

    tree.openElement('svg', NS_SVG);
    tree.closeElement();

    this.shouldEqualNS('<svg:svg></svg:svg>');
  }

  @test
  'namespaced attributes'() {
    const { tree } = this;

    tree.openElement('svg', NS_SVG);
    tree.openElement('a', NS_SVG);
    tree.setAttribute('fill', 'red');
    tree.setAttribute('href', 'linky', NS_XLINK);
    tree.closeElement();
    tree.closeElement();

    this.shouldEqualNS('<svg:svg><svg:a fill="red" xlink:href="linky"></svg:a></svg:svg>');
  }

  protected append(): NodeTokensImpl {
    this.tree.appendTo(this.parent);
    return this.construction.appendTo(this.parent, this.document);
  }

  protected shouldEqual(expectedHTML: string) {
    const tokens = this.append();
    const actualHTML = toHTML(this.parent);
    QUnit.assert.strictEqual(actualHTML, expectedHTML);

    const { expected, actual } = this.tree.reify(tokens);

    QUnit.assert.deepEqual(actual, expected);
  }

  protected shouldEqualNS(expected: string) {
    this.append();
    const actual = toHTMLNS(this.parent);
    QUnit.assert.strictEqual(actual, expected);
  }
}

export class Builder extends TestBuilder {
  protected declare tree: DOMTreeConstruction; // Hides property in base class

  openElement(tag: string, namespace?: Namespace) {
    const token = this.tree.openElement(tag, namespace);
    this.expected[token] = { type: 'element', value: tag.toUpperCase() };
  }
}
