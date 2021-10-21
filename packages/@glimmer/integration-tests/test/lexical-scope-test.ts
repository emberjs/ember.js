import { RenderTest, test, jitSuite, defineComponent } from '..';

class LexicalScopeTest extends RenderTest {
  static suiteName = 'loose mode: lexical scope';

  @test
  'Can use a component in scope'() {
    const Foo = defineComponent({}, 'Hello, world!', { strictMode: false });
    const Bar = defineComponent({ Foo }, '<Foo/>', { strictMode: false });

    this.renderComponent(Bar);
    this.assertHTML('Hello, world!');
    this.assertStableRerender();
  }
}

jitSuite(LexicalScopeTest);
