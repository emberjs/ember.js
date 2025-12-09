import type { Namespace } from '@glimmer/interfaces';
import { NS_HTML, NS_MATHML, NS_SVG } from '@glimmer/constants';
import { defineComponent, jitSuite, RenderTest, test } from '@glimmer-workspace/integration-tests';

class MathElementTest extends RenderTest {
  static suiteName = '<math>';
  query(selector: string) {
    let el = (s: string) => (this.element as unknown as HTMLElement).querySelector(s);
    return el(selector) as Element;
  }
  assertNamespace(selector: string, ns: Namespace) {
    this.assert.strictEqual(
      this.query(selector).namespaceURI,
      ns,
      `Expecting "${ns}" namespace for tag "${selector}"`
    );
  }

  @test
  '<math> element can render'() {
    const Bar = defineComponent({}, '<math><msqrt><mi>x</mi></msqrt></math>');

    this.renderComponent(Bar);

    this.assertNamespace('math', NS_MATHML);
    this.assertNamespace('msqrt', NS_MATHML);
    this.assertNamespace('mi', NS_MATHML);
  }

  @test
  'HTML and <math> element can render together'() {
    const Bar = defineComponent(
      {},
      '<div><p>Math inside:</p><math><msqrt><mi>x</mi></msqrt></math></div>'
    );

    this.renderComponent(Bar);

    this.assertNamespace('div', NS_HTML);
    this.assertNamespace('p', NS_HTML);
    this.assertNamespace('math', NS_MATHML);
    this.assertNamespace('msqrt', NS_MATHML);
    this.assertNamespace('mi', NS_MATHML);
  }

  @test
  'SVG and <math> element can render together'() {
    const Bar = defineComponent(
      {},
      '<svg><circle cx="50" cy="50" r="40" /></svg><math><msqrt><mi>x</mi></msqrt></math>'
    );

    this.renderComponent(Bar);

    this.assertNamespace('svg', NS_SVG);
    this.assertNamespace('circle', NS_SVG);
    this.assertNamespace('math', NS_MATHML);
    this.assertNamespace('msqrt', NS_MATHML);
    this.assertNamespace('mi', NS_MATHML);
  }

  @test
  'HTML, SVG, and <math> element can render together'() {
    const Bar = defineComponent(
      {},
      '<div><p>Math and SVG inside:</p><svg><circle cx="50" cy="50" r="40" /></svg><math><msqrt><mi>x</mi></msqrt></math></div>'
    );

    this.renderComponent(Bar);

    this.assertNamespace('div', NS_HTML);
    this.assertNamespace('p', NS_HTML);
    this.assertNamespace('svg', NS_SVG);
    this.assertNamespace('circle', NS_SVG);
    this.assertNamespace('math', NS_MATHML);
    this.assertNamespace('msqrt', NS_MATHML);
    this.assertNamespace('mi', NS_MATHML);
  }
}

jitSuite(MathElementTest);
