import { RenderTest } from '../render-test';
import { test } from '../test-decorator';
import { stripTight } from '../test-helpers/strings';

export class ScopeSuite extends RenderTest {
  static suiteName = 'Scope';

  @test
  'correct scope - conflicting local names'() {
    this.render({
      layout: stripTight`
        {{#let @a as |item|}}{{@a}}: {{item}},
          {{#let @b as |item|}} {{@b}}: {{item}},
            {{#let @c as |item|}} {{@c}}: {{item}}{{/let}}
          {{/let}}
        {{/let}}`,
      args: { a: '"A"', b: '"B"', c: '"C"' },
    });

    this.assertComponent('A: A, B: B, C: C');
    this.assertStableRerender();
  }

  @test
  'correct scope - conflicting block param and attr names'() {
    this.render({
      layout:
        'Outer: {{@conflict}} {{#let @item as |conflict|}}Inner: {{@conflict}} Block: {{conflict}}{{/let}}',
      args: { item: '"from block"', conflict: '"from attr"' },
    });

    this.assertComponent('Outer: from attr Inner: from attr Block: from block');
    this.assertStableRerender();
  }
}
