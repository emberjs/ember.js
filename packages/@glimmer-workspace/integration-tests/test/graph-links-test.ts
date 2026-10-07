import { consumeTag, createTag, dirtyTag, type TagNode } from '@glimmer/signals';
import {
  defineComponent,
  GlimmerishComponent as Component,
  jitSuite,
  RenderTest,
  test,
} from '@glimmer-workspace/integration-tests';

function hasSubscribers(tag: TagNode) {
  return tag.subs !== undefined;
}

class GraphLinksTest extends RenderTest {
  static suiteName = `links of the reactive graph (rendering)`;

  @test
  'a block that is removed leaves no link on the tags that it read'(assert: Assert) {
    const tag = createTag();
    const read = () => {
      consumeTag(tag);
      return 'value';
    };

    const Inner = defineComponent({ read }, '<p>{{ (read) }}</p>');

    this.render('{{#if this.show}}<this.Inner />{{/if}}', { show: true, Inner });

    this.assertHTML('<p>value</p>');
    assert.true(hasSubscribers(tag), 'the render subscribes to the tag');

    this.rerender({ show: false });

    this.assertHTML('<!---->');
    assert.false(hasSubscribers(tag), 'the removed block has no link');

    this.rerender({ show: true });

    this.assertHTML('<p>value</p>');
    assert.true(hasSubscribers(tag));
  }

  @test
  'a render that is destroyed leaves no link on the tags that it read'(assert: Assert) {
    const tag = createTag();

    class Reader extends Component {
      get value() {
        consumeTag(tag);
        return 'value';
      }
    }

    const Inner = defineComponent({}, '<p>{{this.value}}</p>', { definition: Reader });

    this.render('{{#each this.list key="@index" as |item|}}<this.Inner />{{item}}{{/each}}', {
      list: [1, 2, 3],
      Inner,
    });

    assert.true(hasSubscribers(tag), 'the render subscribes to the tag');

    dirtyTag(tag);
    this.rerender();

    assert.true(hasSubscribers(tag), 'the render subscribes after an update');

    this.destroy();

    assert.false(hasSubscribers(tag), 'the destroyed render has no link');
  }
}

jitSuite(GraphLinksTest);
