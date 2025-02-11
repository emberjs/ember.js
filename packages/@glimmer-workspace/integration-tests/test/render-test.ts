import { defineComponent, jitSuite, RenderTest, test } from '@glimmer-workspace/integration-tests';

class RenderingTest extends RenderTest {
  static suiteName = '<rendering>';

  query(selector: string) {
    let el = (s: string) => (this.element as unknown as HTMLElement).querySelector(s);
    return el(selector) as Element;
  }

  @test
  'Symbols are rendered as strings'() {
    const sym = Symbol('hello world');
    const Bar = defineComponent({ sym }, '<div>{{sym}}</div>');

    this.renderComponent(Bar);
    this.assertHTML(`<div>Symbol(hello world)</div>`);
  }
}

jitSuite(RenderingTest);
