import { moduleFor, RenderingTestCase } from 'internal-test-helpers';

import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@glimmer/manager';
import templateOnly from '@ember/component/template-only';

// A block param may be named like a keyword (`component`, `input`, …). Inside
// its block the name is the block param; outside it, the keyword.
moduleFor(
  'Syntax test: block params named like keywords',
  class extends RenderingTestCase {
    ['@test outside its block, the name is the keyword']() {
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('FooBar'), templateOnly())
      );

      this.render('{{#let "inner" as |component|}}{{component}}{{/let}}|{{component "foo-bar"}}');

      this.assertText('inner|FooBar');
      this.assertStableRerender();
    }

    ['@test the block param is read as an argument']() {
      this.render('{{#let "value" as |input|}}{{concat "got " input}}{{/let}}');

      this.assertText('got value');
      this.assertStableRerender();
    }

    ['@test invoked as a block, the block param keeps its {{else}} block and named arguments']() {
      let Comp = setComponentTemplate(
        precompileTemplate('{{@name}}:{{yield}}|{{yield to="inverse"}}'),
        templateOnly()
      );

      this.render(
        '{{#let this.Comp as |input|}}{{#input name="b"}}main{{else}}inverse{{/input}}{{/let}}',
        { Comp }
      );

      this.assertText('b:main|inverse');
      this.assertStableRerender();
    }

    ['@test invoked as a block, the block param is evaluated once']() {
      let calls = 0;
      let Comp = setComponentTemplate(precompileTemplate('[{{yield}}]'), templateOnly());
      Comp.label = 'L';
      this.registerHelper('pick', () => {
        calls++;
        return Comp;
      });

      this.render('{{#let (pick "a") as |input|}}{{#input}}x{{/input}}{{input.label}}{{/let}}');

      this.assertText('[x]L');
      this.assert.strictEqual(calls, 1, 'the helper ran once');
    }
  }
);
