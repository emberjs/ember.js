import { RenderTest, test, jitSuite } from '..';
import { assertNodeTagName } from '..';
import { Namespace, SimpleElement } from '@simple-dom/interface';
import { assert } from './support';

const SVG_NAMESPACE = Namespace.SVG;
const XLINK_NAMESPACE = Namespace.XLink;
const XHTML_NAMESPACE = 'http://www.w3.org/1999/xhtml';

class UpdatingSvgTest extends RenderTest {
  static suiteName = 'Updating SVG';

  @test
  'HTML namespace from root element is continued to child templates'() {
    this.render('<svg>{{#if this.hasCircle}}<circle />{{/if}}</svg>', { hasCircle: true });

    let assertNamespaces = () => {
      if (assertNodeTagName(this.element.firstChild, 'svg')) {
        assert.equal(this.element.firstChild.namespaceURI, SVG_NAMESPACE);
        if (assertNodeTagName(this.element.firstChild.firstChild, 'circle')) {
          assert.equal(this.element.firstChild.firstChild.namespaceURI, SVG_NAMESPACE);
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
    let parent = this.element;
    let svg = this.delegate.createElementNS(SVG_NAMESPACE, 'svg');
    this.element.appendChild(svg);
    this.element = svg;

    let assertNamespaces = () => {
      if (assertNodeTagName(parent.firstChild, 'svg')) {
        assert.equal(parent.firstChild.namespaceURI, SVG_NAMESPACE);
        if (assertNodeTagName(parent.firstChild.firstChild, 'foreignObject')) {
          assert.equal(parent.firstChild.firstChild.namespaceURI, SVG_NAMESPACE);
        }
      }
    };

    this.render('{{#if hasForeignObject}}<foreignObject><div></div></foreignObject>{{/if}}', {
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

    let assertNamespaces = () => {
      if (assertNodeTagName(this.element.firstChild, 'svg')) {
        assert.equal(this.element.firstChild.namespaceURI, SVG_NAMESPACE);
        if (assertNodeTagName(this.element.firstChild.firstChild, 'foreignObject')) {
          assert.equal(this.element.firstChild.firstChild.namespaceURI, SVG_NAMESPACE);
          if (assertNodeTagName(this.element.firstChild.firstChild.firstChild, 'div')) {
            assert.equal(
              this.element.firstChild.firstChild.firstChild.namespaceURI,
              XHTML_NAMESPACE
            );
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

    let assertNamespaces = () => {
      if (assertNodeTagName(this.element.firstChild, 'svg')) {
        assert.equal(this.element.firstChild.namespaceURI, SVG_NAMESPACE);
        let attr = this.element.firstChild.attributes[0];
        assert.equal(attr.namespaceURI, XLINK_NAMESPACE);
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

    let assertNamespace = () => {
      if (assertNodeTagName(this.element.firstChild, 'svg')) {
        assert.equal(this.element.firstChild.namespaceURI, SVG_NAMESPACE);
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

    let assertNamespaces = (isUnsafe: boolean) => {
      if (assertNodeTagName(this.element.firstChild, 'svg')) {
        assert.equal(this.element.firstChild.namespaceURI, SVG_NAMESPACE);
      }
      if (isUnsafe && assertNodeTagName(this.element.lastChild, 'i')) {
        assert.equal(this.element.lastChild.namespaceURI, XHTML_NAMESPACE);
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
    this.render('<svg>{{{content}}}</svg><div></div>', {
      content: '<path></path>',
    });

    let assertNamespaces = (callback: (svg: SimpleElement) => void) => {
      if (assertNodeTagName(this.element.firstChild, 'svg')) {
        assert.equal(this.element.firstChild.namespaceURI, SVG_NAMESPACE);
        callback(this.element.firstChild as SimpleElement);
      }
      if (assertNodeTagName(this.element.lastChild, 'div')) {
        assert.equal(this.element.lastChild.namespaceURI, XHTML_NAMESPACE);
      }
    };

    this.assertHTML(`<svg><path></path></svg><div></div>`);
    assertNamespaces(svg => {
      if (assertNodeTagName(svg.firstChild, 'path')) {
        assert.equal(
          svg.firstChild.namespaceURI,
          SVG_NAMESPACE,
          'initial render path has SVG namespace'
        );
      }
    });

    this.rerender();

    this.assertHTML(`<svg><path></path></svg><div></div>`);
    assertNamespaces(svg => {
      if (assertNodeTagName(svg.firstChild, 'path')) {
        assert.equal(svg.firstChild.namespaceURI, SVG_NAMESPACE, 'path has SVG namespace');
      }
    });

    this.rerender({
      content: '<foreignObject><span></span></foreignObject>',
    });

    this.assertHTML(`<svg><foreignObject><span></span></foreignObject></svg><div></div>`);
    assertNamespaces(svg => {
      if (assertNodeTagName(svg.firstChild, 'foreignObject')) {
        assert.equal(
          svg.firstChild.namespaceURI,
          SVG_NAMESPACE,
          'initial render path has SVG namespace'
        );
        if (assertNodeTagName(svg.firstChild.firstChild, 'span')) {
          assert.equal(
            svg.firstChild.firstChild.namespaceURI,
            XHTML_NAMESPACE,
            'span has XHTML NS'
          );
        }
      }
    });

    this.rerender({
      content: '<path></path><circle></circle>',
    });

    this.assertHTML(`<svg><path></path><circle></circle></svg><div></div>`);
    assertNamespaces(svg => {
      if (assertNodeTagName(svg.firstChild, 'path')) {
        assert.equal(
          svg.firstChild.namespaceURI,
          SVG_NAMESPACE,
          'initial render path has SVG namespace'
        );
      }
      if (assertNodeTagName(svg.lastChild, 'circle')) {
        assert.equal(
          svg.lastChild.namespaceURI,
          SVG_NAMESPACE,
          'initial render path has SVG namespace'
        );
      }
    });

    this.rerender({ content: '<path></path>' });

    this.assertHTML(`<svg><path></path></svg><div></div>`);
    assertNamespaces(svg => {
      if (assertNodeTagName(svg.firstChild, 'path')) {
        assert.equal(
          svg.firstChild.namespaceURI,
          SVG_NAMESPACE,
          'initial render path has SVG namespace'
        );
      }
    });
  }

  @test
  'expression nested inside a namespace'() {
    this.render('<div><svg>{{content}}</svg></div>', {
      content: 'Milly',
    });

    let assertNamespaces = () => {
      if (assertNodeTagName(this.element.firstChild, 'div')) {
        assert.equal(this.element.firstChild.namespaceURI, XHTML_NAMESPACE);
        if (assertNodeTagName(this.element.firstChild.firstChild, 'svg')) {
          assert.equal(this.element.firstChild.firstChild.namespaceURI, SVG_NAMESPACE);
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
    this.render('<svg>{{content}}</svg>', { content: 'Maurice' });

    let assertSvg = (callback?: (svg: SVGSVGElement) => void) => {
      if (assertNodeTagName(this.element.firstChild, 'svg')) {
        assert.equal(this.element.firstChild.namespaceURI, SVG_NAMESPACE);
        if (callback) callback(this.element.firstChild);
      }
    };

    this.assertHTML(`<svg>Maurice</svg>`);
    assertSvg();
    this.assertStableRerender();

    this.rerender({ content: null });

    assertSvg(svg => {
      assert.strictEqual(svg.firstChild && svg.firstChild.textContent, '');
    });

    this.rerender({ content: 'Maurice' });

    this.assertHTML(`<svg>Maurice</svg>`);
    assertSvg();
  }

  @test
  'HTML namespace is created in child templates'() {
    this.render('{{#if isTrue}}<svg></svg>{{else}}<div><svg></svg></div>{{/if}}', { isTrue: true });

    let assertNamespaces = (isTrue: boolean) => {
      if (isTrue) {
        if (assertNodeTagName(this.element.firstChild, 'svg')) {
          assert.equal(this.element.firstChild.namespaceURI, SVG_NAMESPACE);
        }
      } else {
        if (assertNodeTagName(this.element.firstChild, 'div')) {
          assert.equal(this.element.firstChild.namespaceURI, XHTML_NAMESPACE);
          if (assertNodeTagName(this.element.firstChild.firstChild, 'svg')) {
            assert.equal(this.element.firstChild.firstChild.namespaceURI, SVG_NAMESPACE);
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
    this.render('<div><svg>{{#if isTrue}}<circle />{{/if}}</svg></div>', { isTrue: true });

    let assertNamespaces = (isTrue: boolean) => {
      if (assertNodeTagName(this.element.firstChild, 'div')) {
        assert.equal(this.element.firstChild.namespaceURI, XHTML_NAMESPACE);
        if (assertNodeTagName(this.element.firstChild.firstChild, 'svg')) {
          assert.equal(this.element.firstChild.firstChild.namespaceURI, SVG_NAMESPACE);
          if (
            isTrue &&
            assertNodeTagName(this.element.firstChild.firstChild.firstChild, 'circle')
          ) {
            assert.equal(this.element.firstChild.firstChild.firstChild.namespaceURI, SVG_NAMESPACE);
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
