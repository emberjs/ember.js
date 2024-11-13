import { defineComponent, jitSuite, RenderTest, test, tracked } from '../..';

class Each extends RenderTest {
  static suiteName = '{{#each}} keyword';

  @test
  'each with undefined item https://github.com/emberjs/ember.js/issues/20786'() {
    class State {
      @tracked data = [undefined];
    }

    let state = new State();

    const Bar = defineComponent(
      { state },
      `{{#each state.data key='anything' as |datum|}}
        {{datum}}
       {{/each}}`
        .replaceAll(/^\s|\s+$|\s+(?=\s)/gu, '')
        .replaceAll(/\n/gu, '')
    );

    this.renderComponent(Bar);

    this.assertHTML('  ');
  }
}

jitSuite(Each);
