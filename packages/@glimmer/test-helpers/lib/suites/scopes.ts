import { RenderTest, test } from '../render-test';
import { stripTight } from '../helpers';

export class ScopeSuite extends RenderTest {
  @test
  "correct scope - conflicting local names"() {
    this.render({
      layout: stripTight`
        {{#with @a as |item|}}{{@a}}: {{item}},
          {{#with @b as |item|}} {{@b}}: {{item}},
            {{#with @c as |item|}} {{@c}}: {{item}}{{/with}}
          {{/with}}
        {{/with}}`,
      args: { a: '"A"', b: '"B"', c: '"C"' }
    });

    this.assertComponent('A: A, B: B, C: C');
    this.assertStableRerender();
  }

  @test
  "correct scope - conflicting block param and attr names"() {
    this.render({
      layout: 'Outer: {{@conflict}} {{#with @item as |conflict|}}Inner: {{@conflict}} Block: {{conflict}}{{/with}}',
      args: { item: '"from block"', conflict: '"from attr"' }
    });

    this.assertComponent('Outer: from attr Inner: from attr Block: from block');
    this.assertStableRerender();
  }
}
