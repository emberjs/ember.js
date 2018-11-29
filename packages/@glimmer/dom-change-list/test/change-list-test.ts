import { DOMTreeConstruction, NodeTokens } from '@glimmer/dom-change-list';
import { Simple } from '@glimmer/interfaces';
import { Namespace } from '@simple-dom/interface';
import createHTMLDocument from '@simple-dom/document';

import { TestCase, module, test } from './test-case';
import { Builder as TestBuilder, toHTML, toHTMLNS } from './support';

const SVG: Namespace = Namespace.SVG;
const XLINK: Namespace = Namespace.XLink;

@module('[dom-change-list] DOMTreeConstruction')
export class ChangeListTest extends TestCase {
  // These definitely assigned properties are set in before()
  protected document!: Simple.Document;
  protected parent!: Simple.Element | Simple.DocumentFragment;
  protected tree!: Builder;
  protected construction!: DOMTreeConstruction;

  before() {
    this.document = createHTMLDocument();
    this.parent = document.createElement('div') as Simple.Element;
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

    tree.openElement('svg', SVG);
    tree.closeElement();

    this.shouldEqualNS('<svg:svg></svg:svg>');
  }

  @test
  'namespaced attributes'() {
    let { tree } = this;

    tree.openElement('svg', SVG);
    tree.openElement('a', SVG);
    tree.setAttribute('fill', 'red');
    tree.setAttribute('href', 'linky', XLINK);
    tree.closeElement();
    tree.closeElement();

    this.shouldEqualNS('<svg:svg><svg:a fill="red" xlink:href="linky"></svg:a></svg:svg>');
  }

  protected append(): NodeTokens {
    this.tree.appendTo(this.parent);
    return this.construction.appendTo(this.parent, document as Simple.Document);
  }

  protected shouldEqual(expectedHTML: string) {
    let tokens = this.append();
    let actualHTML = toHTML(this.parent);
    QUnit.assert.equal(actualHTML, expectedHTML);

    let { expected, actual } = this.tree.reify(tokens);

    QUnit.assert.deepEqual(actual, expected);
  }

  protected shouldEqualNS(expected: string) {
    this.append();
    let actual = toHTMLNS(this.parent);
    QUnit.assert.equal(actual, expected);
  }
}

export class Builder extends TestBuilder {
  protected tree!: DOMTreeConstruction; // Hides property in base class

  openElement(tag: string, namespace?: Namespace) {
    let token = this.tree.openElement(tag, namespace);
    this.expected[token] = { type: 'element', value: tag.toUpperCase() };
  }
}
