/**
 * Blocks and block params (compat, GXT_MODE).
 *
 * Glimmer semantics:
 * - a component's `{{else}}` block, `<:else>` and `<:inverse>` are one block:
 *   `{{yield to="else"}}` and `{{yield to="inverse"}}` render it and
 *   `(has-block "else")` / `(has-block "inverse")` see it, whatever invoked the
 *   component (curly, a `{{#component}}` block, angle brackets);
 * - a tag naming a block param in scope invokes the param's value as a
 *   component, whatever its case (`<Yielder as |greet|><greet /></Yielder>`).
 *
 * The test page loads this file only in GXT builds (`virtual:gxt-tests`).
 */
import { moduleFor, RenderingTestCase, runTask } from 'internal-test-helpers';
import { set } from '@ember/object';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@glimmer/manager';
import GlimmerComponent from '@glimmer/component';

// A layout rendering its default block with `@value` when `@predicate` is
// true, and its else block (yielded to `to`) otherwise.
function ifLayout(to: string): string {
  return `{{#if @predicate}}Yes:{{yield @value}}{{else}}No:{{yield to="${to}"}}{{/if}}`;
}

moduleFor(
  'GXT else blocks',
  class extends RenderingTestCase {
    registerLayout(name: string, layout: string): void {
      this.owner.register(
        `component:${name}`,
        setComponentTemplate(precompileTemplate(layout), class extends GlimmerComponent {})
      );
    }

    ['@test {{yield to="else"}} renders the {{else}} block of a curly invocation']() {
      this.registerLayout('x-if', ifLayout('else'));
      this.render('{{#x-if predicate=this.on value=42 as |v|}}Hello{{v}}{{else}}Goodbye{{/x-if}}', {
        on: false,
      });
      this.assertText('No:Goodbye');

      runTask(() => set(this.context, 'on', true));
      this.assertText('Yes:Hello42');

      runTask(() => set(this.context, 'on', false));
      this.assertText('No:Goodbye');
    }

    ['@test a {{#component}} block passes its {{else}} block']() {
      this.registerLayout('x-if', ifLayout('else'));
      this.registerLayout('y-if', ifLayout('inverse'));
      this.render(
        '[{{#component this.x predicate=this.on value=1 as |v|}}A{{v}}{{else}}B{{/component}}]' +
          '[{{#component this.y predicate=this.on value=2 as |v|}}C{{v}}{{else}}D{{/component}}]',
        { x: 'x-if', y: 'y-if', on: false }
      );
      this.assertText('[No:B][No:D]');

      runTask(() => set(this.context, 'on', true));
      this.assertText('[Yes:A1][Yes:C2]');
    }

    ['@test (has-block "inverse") sees the {{else}} block of a {{#component}} block']() {
      this.registerLayout('check-else', '[{{has-block "else"}}|{{has-block "inverse"}}]');
      this.render(
        '{{#component this.name}}x{{else}}y{{/component}}{{#component this.name}}x{{/component}}',
        { name: 'check-else' }
      );
      this.assertText('[true|true][false|false]');
    }

    ['@test an <:else> block is yielded to "else" and to "inverse"']() {
      let ToElse = setComponentTemplate(
        precompileTemplate(ifLayout('else')),
        class extends GlimmerComponent {}
      );
      let ToInverse = setComponentTemplate(
        precompileTemplate(ifLayout('inverse')),
        class extends GlimmerComponent {}
      );
      this.render(
        '[<this.ToElse @predicate={{this.on}}><:default>A</:default><:else>B</:else></this.ToElse>]' +
          '[<this.ToInverse @predicate={{this.on}}><:default>C</:default><:else>D</:else></this.ToInverse>]',
        { ToElse, ToInverse, on: false }
      );
      this.assertText('[No:B][No:D]');
    }
  }
);

moduleFor(
  'GXT block params',
  class extends RenderingTestCase {
    ['@test a tag naming a block param invokes the yielded component']() {
      this.owner.register(
        'component:greeting',
        setComponentTemplate(
          precompileTemplate('<p>hi {{@name}}</p>'),
          class extends GlimmerComponent {}
        )
      );
      this.owner.register(
        'component:yielder',
        setComponentTemplate(
          precompileTemplate('{{yield (component "greeting" name="x")}}'),
          class extends GlimmerComponent {}
        )
      );
      this.render(
        '<Yielder as |greet|><greet /></Yielder>|<Yielder as |greet|><greet @name="y"></greet></Yielder>'
      );
      this.assertText('hi x|hi y');
      this.assert.strictEqual(this.element.querySelector('greet'), null, 'no <greet> element');
    }
  }
);
