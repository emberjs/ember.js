/**
 * Dynamic component invocations (compat, GXT_MODE).
 *
 * Glimmer semantics: `{{component this.value}}`, `{{#component this.value}}`
 * and `<this.value />` render the component the value defines (a component
 * definition, a curried component or, for `{{component}}` in a loose-mode
 * template, a component name). When the value changes to another definition,
 * the component of the old one is destroyed and the component of the new one
 * renders in its place, whatever the old one rendered (nothing included).
 * While the value defines no component, the invocation renders nothing (an
 * empty comment holds its place).
 *
 * The test page loads this file only in GXT builds (`virtual:gxt-tests`).
 */
import { moduleFor, RenderingTestCase, runTask } from 'internal-test-helpers';
import type Owner from '@ember/owner';
import { set } from '@ember/object';
import templateOnly from '@ember/component/template-only';
import { setComponentTemplate } from '@glimmer/manager';
import GlimmerComponent from '@glimmer/component';

moduleFor(
  'GXT dynamic components follow their definition',
  class extends RenderingTestCase {
    // Two Glimmer components that render their name and `@name`, and record
    // their instances. A destroyed one is `isDestroying` once its manager
    // destroys it (its `willDestroy` runs in the run loop after).
    defineComponents() {
      let instances: GlimmerComponent[] = [];
      class Recorded extends GlimmerComponent {
        constructor(owner: Owner, args: object) {
          super(owner, args);
          instances.push(this);
        }
      }
      let Foo = setComponentTemplate(this.compile('Foo {{@name}}'), class extends Recorded {});
      let Bar = setComponentTemplate(this.compile('Bar {{@name}}'), class extends Recorded {});
      return { Foo, Bar, instances };
    }

    ['@test {{component}} renders the component of the definition its value changes to'](
      assert: QUnit['assert']
    ) {
      let { Foo, Bar, instances } = this.defineComponents();

      this.render('[{{component this.value name=this.name}}]', { value: Foo, name: 'a' });
      this.assertText('[Foo a]');

      runTask(() => set(this.context, 'value', Bar));
      this.assertText('[Bar a]');
      assert.strictEqual(instances.length, 2, 'a component of the new definition is created');
      assert.true(instances[0]!.isDestroying, 'the component of the old definition is destroyed');

      runTask(() => set(this.context, 'name', 'b'));
      this.assertText('[Bar b]');

      runTask(() => set(this.context, 'value', Foo));
      this.assertText('[Foo b]');
      assert.strictEqual(instances.length, 3, 'a component of the definition is created again');
      assert.true(instances[1]!.isDestroying, 'the component it replaces is destroyed');
    }

    ['@test an angle-bracket invocation renders the component of the definition its value changes to'](
      assert: QUnit['assert']
    ) {
      let { Foo, Bar, instances } = this.defineComponents();

      this.render('[<this.value @name={{this.name}} />]', { value: Foo, name: 'a' });
      this.assertText('[Foo a]');

      runTask(() => set(this.context, 'value', Bar));
      this.assertText('[Bar a]');
      assert.true(instances[0]!.isDestroying, 'the component of the old definition is destroyed');

      runTask(() => set(this.context, 'value', Foo));
      this.assertText('[Foo a]');
      assert.true(instances[1]!.isDestroying, 'the component it replaces is destroyed');
    }

    ['@test a dynamic component renders nothing while its value defines no component'](
      assert: QUnit['assert']
    ) {
      let { Foo, instances } = this.defineComponents();

      this.render('<p>{{component this.value name="a"}}</p>', { value: null });
      this.assertHTML('<p><!----></p>');

      runTask(() => set(this.context, 'value', Foo));
      this.assertHTML('<p>Foo a</p>');

      runTask(() => set(this.context, 'value', null));
      this.assertHTML('<p><!----></p>');
      assert.true(instances[0]!.isDestroying, 'the component is destroyed');

      runTask(() => set(this.context, 'value', Foo));
      this.assertHTML('<p>Foo a</p>');
    }

    ['@test a dynamic component that rendered nothing renders the component its value changes to']() {
      let { Foo } = this.defineComponents();
      let Empty = setComponentTemplate(this.compile(''), templateOnly());

      this.render('[{{component this.value name="a"}}]', { value: Empty });
      this.assertText('[]');

      runTask(() => set(this.context, 'value', Foo));
      this.assertText('[Foo a]');

      runTask(() => set(this.context, 'value', Empty));
      this.assertText('[]');
    }
  }
);
