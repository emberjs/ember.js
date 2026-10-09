import type { SimpleElement } from '@glimmer/interfaces';
import { unwrap } from '@glimmer/debug-util';

import type { Count } from '../render-test';

import { RenderTest } from '../render-test';
import { test } from '../test-decorator';

export class EmberishComponentTests extends RenderTest {
  static suiteName = 'Emberish';

  @test({ kind: 'glimmer' })
  'Element modifier with hooks'(assert: Assert, count: Count) {
    this.registerModifier(
      'foo',
      class {
        element?: SimpleElement;
        didInsertElement() {
          count.expect('didInsertElement');
          assert.ok(this.element, 'didInsertElement');
          assert.strictEqual(
            unwrap(this.element).getAttribute('data-ok'),
            'true',
            'didInsertElement'
          );
        }

        didUpdate() {
          count.expect('didUpdate');
          assert.ok(true, 'didUpdate');
        }

        willDestroyElement() {
          count.expect('willDestroyElement');
          assert.ok(true, 'willDestroyElement');
        }
      }
    );

    this.render('{{#if this.ok}}<div data-ok=true {{foo this.bar}}></div>{{/if}}', {
      bar: 'bar',
      ok: true,
    });

    this.rerender({ bar: 'foo' });
    this.rerender({ ok: false });
  }

  @test
  'non-block without properties'() {
    this.render({
      layout: 'In layout',
    });

    this.assertComponent('In layout');
    this.assertStableRerender();
  }

  @test
  'block without properties'() {
    this.render({
      layout: 'In layout -- {{yield}}',
      template: 'In template',
    });

    this.assertComponent('In layout -- In template');
    this.assertStableRerender();
  }

  @test
  'yield inside a conditional on the component'() {
    this.render(
      {
        layout: 'In layout -- {{#if @predicate}}{{yield}}{{/if}}',
        template: 'In template',
        args: { predicate: 'this.predicate' },
      },
      { predicate: true }
    );

    this.assertComponent('In layout -- In template', {});
    this.assertStableRerender();

    this.rerender({ predicate: false });
    this.assertComponent('In layout -- <!---->');
    this.assertStableNodes();

    this.rerender({ predicate: true });
    this.assertComponent('In layout -- In template', {});
    this.assertStableNodes();
  }

  @test
  'non-block with properties on attrs'() {
    this.render({
      layout: 'In layout - someProp: {{@someProp}}',
      args: { someProp: '"something here"' },
    });

    this.assertComponent('In layout - someProp: something here');
    this.assertStableRerender();
  }

  @test
  'block with properties on attrs'() {
    this.render({
      layout: 'In layout - someProp: {{@someProp}} - {{yield}}',
      template: 'In template',
      args: { someProp: '"something here"' },
    });

    this.assertComponent('In layout - someProp: something here - In template');
    this.assertStableRerender();
  }

  @test({ skip: true, kind: 'glimmer' })
  'glimmer component with role specified as an outer binding and copied'() {
    this.render(
      {
        layout: 'Here!',
        attributes: { id: '"aria-test"', role: 'myRole' },
      },
      { myRole: 'main' }
    );

    this.assertComponent('Here!', { id: '"aria-test"', role: '"main"' });
    this.assertStableRerender();
  }

  // LOCKS
  @test({ kind: 'glimmer' })
  'explicit default named block'() {
    this.registerComponent('Glimmer', 'FooBar', 'Hello{{yield to="default"}}world!');

    this.render(`<FooBar><:default> my </:default></FooBar>`);

    this.assertHTML('Hello my world!');
    this.assertStableRerender();
  }

  // LOCKS
  @test({ kind: 'glimmer' })
  'else named block'() {
    this.registerComponent('Glimmer', 'FooBar', 'Hello{{yield "my" to="inverse"}}world!');

    this.render(`<FooBar><:else as |value|> {{value}} </:else></FooBar>`);

    this.assertHTML('Hello my world!');
    this.assertStableRerender();
  }

  @test({ kind: 'glimmer' })
  'inverse named block'() {
    this.registerComponent('Glimmer', 'FooBar', 'Hello{{yield "my" to="inverse"}}world!');

    this.render(`<FooBar><:inverse as |value|> {{value}} </:inverse></FooBar>`);

    this.assertHTML('Hello my world!');
    this.assertStableRerender();
  }
}
