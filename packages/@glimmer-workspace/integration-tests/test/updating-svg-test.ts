import type { SimpleElement } from '@glimmer/interfaces';
import { NS_HTML, NS_SVG, NS_XLINK } from '@glimmer/util';

import { assertNodeTagName, jitSuite, RenderTest, test } from '..';
import { assert } from './support';

class UpdatingSvgTest extends RenderTest {
  static suiteName = 'Updating SVG';

  @test
  'HTML namespace from root element is continued to child templates'() {
    this.render('<svg>{{#if this.hasCircle}}<circle />{{/if}}</svg>', { hasCircle: true });

    const assertNamespaces = () => {
      if (assertNodeTagName(this.element.firstChild, 'svg')) {
        assert.strictEqual(this.element.firstChild.namespaceURI, NS_SVG);
        if (assertNodeTagName(this.element.firstChild.firstChild, 'circle')) {
          assert.strictEqual(this.element.firstChild.firstChild.namespaceURI, NS_SVG);
        }
      }
    };

    this.assertHTML('<svg><circle /></svg>');
    assertNamespaces();
    this.assertStableRerender();

    this.rerender({ hasCircle: false });
    this.assertHTML('<svg><!----></svg>');

    this.rerender({ hasCircle: true });

    this.assertHTML('<svg><circle /></svg>');
    assertNamespaces();
  }

  @test
  'context.root <foreignObject> tag is SVG namespaced'() {
    const parent = this.element;
    const svg = this.delegate.createElementNS(NS_SVG, 'svg');
    this.element.appendChild(svg);
    this.element = svg;

    const assertNamespaces = () => {
      if (assertNodeTagName(parent.firstChild, 'svg')) {
        assert.strictEqual(parent.firstChild.namespaceURI, NS_SVG);
        if (assertNodeTagName(parent.firstChild.firstChild, 'foreignObject')) {
          assert.strictEqual(parent.firstChild.firstChild.namespaceURI, NS_SVG);
        }
      }
    };

    this.render('{{#if this.hasForeignObject}}<foreignObject><div></div></foreignObject>{{/if}}', {
      hasForeignObject: true,
    });

    this.assertHTML('<svg><foreignObject><div></div></foreignObject></svg>', parent);
    assertNamespaces();
    this.assertStableRerender();

    this.rerender({ hasForeignObject: false });

    this.assertHTML('<svg><!----></svg>', parent);

    this.rerender({ hasForeignObject: true });

    this.assertHTML('<svg><foreignObject><div></div></foreignObject></svg>', parent);
    assertNamespaces();
  }

  @test
  'elements nested inside <foreignObject> have an XHTML namespace'() {
    this.render('<svg><foreignObject>{{#if this.hasDiv}}<div></div>{{/if}}</foreignObject></svg>', {
      hasDiv: true,
    });

    const assertNamespaces = () => {
      if (assertNodeTagName(this.element.firstChild, 'svg')) {
        assert.strictEqual(this.element.firstChild.namespaceURI, NS_SVG);
        if (assertNodeTagName(this.element.firstChild.firstChild, 'foreignObject')) {
          assert.strictEqual(this.element.firstChild.firstChild.namespaceURI, NS_SVG);
          if (assertNodeTagName(this.element.firstChild.firstChild.firstChild, 'div')) {
            assert.strictEqual(this.element.firstChild.firstChild.firstChild.namespaceURI, NS_HTML);
          }
        }
      }
    };

    this.assertHTML('<svg><foreignObject><div></div></foreignObject></svg>');
    assertNamespaces();
    this.assertStableRerender();

    this.rerender({ hasDiv: false });

    this.assertHTML('<svg><foreignObject><!----></foreignObject></svg>');

    this.rerender({ hasDiv: true });

    this.assertHTML('<svg><foreignObject><div></div></foreignObject></svg>');
    assertNamespaces();
  }

  @test
  'Namespaced attribute with a quoted expression'() {
    this.render('<svg xlink:title="{{this.title}}">content</svg>', { title: 'svg-title' });

    const assertNamespaces = () => {
      if (assertNodeTagName(this.element.firstChild, 'svg')) {
        assert.strictEqual(this.element.firstChild.namespaceURI, NS_SVG);
        const [attr] = this.guardArray(
          { attributes: this.element.firstChild.attributes },
          { min: 1 }
        );
        assert.strictEqual(attr.namespaceURI, NS_XLINK);
      }
    };

    this.assertHTML(`<svg xlink:title="svg-title">content</svg>`);
    assertNamespaces();
    this.assertStableRerender();

    this.rerender({ title: 'mmun' });

    this.assertHTML(`<svg xlink:title="mmun">content</svg>`);
    assertNamespaces();

    this.rerender({ title: 'svg-title' });

    this.assertHTML(`<svg xlink:title="svg-title">content</svg>`);
    assertNamespaces();
  }

  @test
  '<svg> tag and expression as sibling'() {
    this.render('<svg></svg>{{this.name}}', { name: 'svg-title' });

    const assertNamespace = () => {
      if (assertNodeTagName(this.element.firstChild, 'svg')) {
        assert.strictEqual(this.element.firstChild.namespaceURI, NS_SVG);
      }
    };

    this.assertHTML(`<svg></svg>svg-title`);
    assertNamespace();
    this.assertStableRerender();

    this.rerender({ name: null });

    this.assertHTML(`<svg></svg>`);
    assertNamespace();

    this.rerender({ name: 'svg-title' });

    this.assertHTML(`<svg></svg>svg-title`);
    assertNamespace();
  }

  @test
  '<svg> tag and unsafe expression as sibling'() {
    this.render('<svg></svg>{{{this.name}}}', { name: '<i>Biff</i>' });

    const assertNamespaces = (isUnsafe: boolean) => {
      if (assertNodeTagName(this.element.firstChild, 'svg')) {
        assert.strictEqual(this.element.firstChild.namespaceURI, NS_SVG);
      }
      if (isUnsafe && assertNodeTagName(this.element.lastChild, 'i')) {
        assert.strictEqual(this.element.lastChild.namespaceURI, NS_HTML);
      }
    };

    this.assertHTML(`<svg></svg><i>Biff</i>`);
    assertNamespaces(true);
    this.assertStableRerender();

    this.rerender({ name: 'ef4' });

    this.assertHTML(`<svg></svg>ef4`);
    assertNamespaces(false);

    this.rerender({ name: '<i>Biff</i>' });

    this.assertHTML(`<svg></svg><i>Biff</i>`);
    assertNamespaces(true);
  }

  @test
  'unsafe expression nested inside a namespace'() {
    this.render('<svg>{{{this.content}}}</svg><div></div>', {
      content: '<path></path>',
    });

    const assertNamespaces = (withElement: (svg: SimpleElement) => void) => {
      if (assertNodeTagName(this.element.firstChild, 'svg')) {
        assert.strictEqual(this.element.firstChild.namespaceURI, NS_SVG);
        withElement(this.element.firstChild as SimpleElement);
      }
      if (assertNodeTagName(this.element.lastChild, 'div')) {
        assert.strictEqual(this.element.lastChild.namespaceURI, NS_HTML);
      }
    };

    this.assertHTML(`<svg><path></path></svg><div></div>`);
    assertNamespaces((svg) => {
      if (assertNodeTagName(svg.firstChild, 'path')) {
        assert.strictEqual(
          svg.firstChild.namespaceURI,
          NS_SVG,
          'initial render path has SVG namespace'
        );
      }
    });

    this.rerender();

    this.assertHTML(`<svg><path></path></svg><div></div>`);
    assertNamespaces((svg) => {
      if (assertNodeTagName(svg.firstChild, 'path')) {
        assert.strictEqual(svg.firstChild.namespaceURI, NS_SVG, 'path has SVG namespace');
      }
    });

    this.rerender({
      content: '<foreignObject><span></span></foreignObject>',
    });

    this.assertHTML(`<svg><foreignObject><span></span></foreignObject></svg><div></div>`);
    assertNamespaces((svg) => {
      if (assertNodeTagName(svg.firstChild, 'foreignObject')) {
        assert.strictEqual(
          svg.firstChild.namespaceURI,
          NS_SVG,
          'initial render path has SVG namespace'
        );
        if (assertNodeTagName(svg.firstChild.firstChild, 'span')) {
          assert.strictEqual(svg.firstChild.firstChild.namespaceURI, NS_HTML, 'span has XHTML NS');
        }
      }
    });

    this.rerender({
      content: '<path></path><circle></circle>',
    });

    this.assertHTML(`<svg><path></path><circle></circle></svg><div></div>`);
    assertNamespaces((svg) => {
      if (assertNodeTagName(svg.firstChild, 'path')) {
        assert.strictEqual(
          svg.firstChild.namespaceURI,
          NS_SVG,
          'initial render path has SVG namespace'
        );
      }
      if (assertNodeTagName(svg.lastChild, 'circle')) {
        assert.strictEqual(
          svg.lastChild.namespaceURI,
          NS_SVG,
          'initial render path has SVG namespace'
        );
      }
    });

    this.rerender({ content: '<path></path>' });

    this.assertHTML(`<svg><path></path></svg><div></div>`);
    assertNamespaces((svg) => {
      if (assertNodeTagName(svg.firstChild, 'path')) {
        assert.strictEqual(
          svg.firstChild.namespaceURI,
          NS_SVG,
          'initial render path has SVG namespace'
        );
      }
    });
  }

  @test
  'expression nested inside a namespace'() {
    this.render('<div><svg>{{this.content}}</svg></div>', {
      content: 'Milly',
    });

    const assertNamespaces = () => {
      if (assertNodeTagName(this.element.firstChild, 'div')) {
        assert.strictEqual(this.element.firstChild.namespaceURI, NS_HTML);
        if (assertNodeTagName(this.element.firstChild.firstChild, 'svg')) {
          assert.strictEqual(this.element.firstChild.firstChild.namespaceURI, NS_SVG);
        }
      }
    };

    this.assertHTML(`<div><svg>Milly</svg></div>`);
    assertNamespaces();
    this.assertStableRerender();

    this.rerender({ content: 'Moe' });

    this.assertHTML(`<div><svg>Moe</svg></div>`);
    assertNamespaces();

    this.rerender({ content: 'Milly' });

    this.assertHTML(`<div><svg>Milly</svg></div>`);
    assertNamespaces();
  }

  @test
  'expression nested inside a namespaced context.root element'() {
    this.render('<svg>{{this.content}}</svg>', { content: 'Maurice' });

    const assertSvg = (withSVG?: (svg: SVGSVGElement) => void) => {
      if (assertNodeTagName(this.element.firstChild, 'svg')) {
        assert.strictEqual(this.element.firstChild.namespaceURI, NS_SVG);
        if (withSVG) withSVG(this.element.firstChild);
      }
    };

    this.assertHTML(`<svg>Maurice</svg>`);
    assertSvg();
    this.assertStableRerender();

    this.rerender({ content: null });

    assertSvg((svg) => {
      assert.strictEqual(svg.firstChild && svg.firstChild.textContent, '');
    });

    this.rerender({ content: 'Maurice' });

    this.assertHTML(`<svg>Maurice</svg>`);
    assertSvg();
  }

  @test
  'HTML namespace is created in child templates'() {
    this.render('{{#if this.isTrue}}<svg></svg>{{else}}<div><svg></svg></div>{{/if}}', {
      isTrue: true,
    });

    const assertNamespaces = (isTrue: boolean) => {
      if (isTrue) {
        if (assertNodeTagName(this.element.firstChild, 'svg')) {
          assert.strictEqual(this.element.firstChild.namespaceURI, NS_SVG);
        }
      } else {
        if (assertNodeTagName(this.element.firstChild, 'div')) {
          assert.strictEqual(this.element.firstChild.namespaceURI, NS_HTML);
          if (assertNodeTagName(this.element.firstChild.firstChild, 'svg')) {
            assert.strictEqual(this.element.firstChild.firstChild.namespaceURI, NS_SVG);
          }
        }
      }
    };

    this.assertHTML(`<svg></svg>`);
    assertNamespaces(true);
    this.assertStableRerender();

    this.rerender({ isTrue: false });

    this.assertHTML(`<div><svg></svg></div>`);
    assertNamespaces(false);

    this.rerender({ isTrue: true });

    this.assertHTML(`<svg></svg>`);
    assertNamespaces(true);
  }

  @test
  'HTML namespace is continued to child templates'() {
    this.render('<div><svg>{{#if this.isTrue}}<circle />{{/if}}</svg></div>', { isTrue: true });

    const assertNamespaces = (isTrue: boolean) => {
      if (assertNodeTagName(this.element.firstChild, 'div')) {
        assert.strictEqual(this.element.firstChild.namespaceURI, NS_HTML);
        if (assertNodeTagName(this.element.firstChild.firstChild, 'svg')) {
          assert.strictEqual(this.element.firstChild.firstChild.namespaceURI, NS_SVG);
          if (
            isTrue &&
            assertNodeTagName(this.element.firstChild.firstChild.firstChild, 'circle')
          ) {
            assert.strictEqual(this.element.firstChild.firstChild.firstChild.namespaceURI, NS_SVG);
          }
        }
      }
    };

    this.assertHTML(`<div><svg><circle /></svg></div>`);
    assertNamespaces(true);
    this.assertStableRerender();

    this.rerender({ isTrue: false });

    this.assertHTML(`<div><svg><!----></svg></div>`);
    assertNamespaces(false);

    this.rerender({ isTrue: true });

    this.assertHTML(`<div><svg><circle /></svg></div>`);
    assertNamespaces(true);
  }
}

jitSuite(UpdatingSvgTest);
