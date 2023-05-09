import { DOMTreeConstruction, type NodeTokensImpl, TreeBuilder } from '@glimmer/dom-change-list';
import {
  type SimpleDocument,
  type SimpleDocumentFragment,
  type SimpleElement,
} from '@glimmer/interfaces';
import createHTMLDocument from '@simple-dom/document';

import { Builder as TestBuilder, toHTML, toHTMLNS, XLINK } from './support';
import { module, test, TestCase } from './test-case';

@module('[dom-change-list] TreeBuilder')
export class ChangeListTest extends TestCase {
  // These definitely assigned properties are set in before()
  protected declare document: SimpleDocument;
  protected declare parent: SimpleElement | SimpleDocumentFragment;
  protected declare tree: Builder;
  protected declare builder: TreeBuilder;
  protected declare construction: DOMTreeConstruction;

  override before() {
    this.document = createHTMLDocument();
    this.parent = this.document.createElement('div');
    this.construction = new DOMTreeConstruction();
    this.builder = new TreeBuilder(this.construction);
    this.tree = new Builder(this.builder);
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
    let { tree } = this;

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
    let { tree } = this;

    tree.openElement('span');
    tree.setAttribute('class', 'chad');
    tree.closeElement();

    this.shouldEqual(`<span class="chad"></span>`);
  }

  @test
  'nested elements'() {
    let { tree } = this;

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
    let { tree } = this;

    tree.openElement('svg');
    tree.closeElement();

    this.shouldEqualNS('<svg:svg></svg:svg>');
  }

  @test
  'namespaced attributes'() {
    let { tree } = this;

    tree.openElement('svg');
    tree.openElement('a');
    tree.setAttribute('fill', 'red');
    tree.setAttribute('href', 'linky', XLINK);
    tree.closeElement();
    tree.closeElement();

    this.shouldEqualNS('<svg:svg><svg:a fill="red" xlink:href="linky"></svg:a></svg:svg>');
  }

  protected append(): NodeTokensImpl {
    this.tree.appendTo(this.parent);
    return this.construction.appendTo(this.parent, this.document);
  }

  protected shouldEqual(expectedHTML: string) {
    let tokens = this.append();
    let actualHTML = toHTML(this.parent);
    QUnit.assert.strictEqual(actualHTML, expectedHTML);

    let { expected, actual } = this.tree.reify(tokens);

    QUnit.assert.deepEqual(actual, expected);
  }

  protected shouldEqualNS(expected: string) {
    this.append();
    let actual = toHTMLNS(this.parent);
    QUnit.assert.strictEqual(actual, expected);
  }
}

export class Builder extends TestBuilder {
  protected declare tree: TreeBuilder; // Hides property in base class

  openElement(tag: string) {
    let token = this.tree.openElement(tag);
    this.expected[token] = { type: 'element', value: tag.toUpperCase() };
  }
}
