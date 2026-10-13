// gxt NATIVE layer: loose-mode (resolver-mode) resolution (Inc 8; gxt G10 +
// G11, native/resolver.ts). Loose templates — runtime-compiled
// (RenderingTestCase#render) and build-time `precompileTemplate(…)` compiled by
// gxt (G10) — resolve free names BY NAME through the owner, with Glimmer's
// syntax rules: `<FooBar>` / `<Foo::Bar>` / `{{#foo-bar}}` / `{{component
// "foo-bar"}}` are components, a content `{{foo-bar …}}` is a component or a
// helper, sub-expressions are helpers, element modifiers are modifiers.
// Unresolvable names raise Glimmer's errors instead of rendering a literal
// element or nothing. Only modern definitions (Glimmer / template-only
// components, function / class helpers, managed modifiers) — the classic
// @ember/component cases of the classic modules are documented drops.
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@ember/component';
import templateOnly from '@ember/component/template-only';
import { helper } from '@ember/component/helper';
import { setModifierManager, modifierCapabilities } from '@glimmer/manager';
import { set } from '@ember/object';
import { tracked } from '@glimmer/tracking';
import Component from '@glimmer/component';
import { DEBUG } from '@glimmer/env';
import { RenderingTestCase, moduleFor, runTask } from 'internal-test-helpers';

function names(nodes, out = []) {
  for (const node of nodes) {
    out.push(node.name);
    names(node.children, out);
  }
  return out;
}

function simpleModifier(fn) {
  return setModifierManager(
    () => ({
      capabilities: modifierCapabilities('3.22'),
      createModifier() {
        return {};
      },
      installModifier(_state, element, args) {
        fn(element, args.positional, args.named);
      },
      updateModifier() {},
      destroyModifier() {},
    }),
    class SimpleModifier {}
  );
}

moduleFor(
  'gxt-native | loose-mode resolution',
  class extends RenderingTestCase {
    ['@test <FooBar>, <XBlah>, <X-Blah>, <Foo> and <Foo::Bar> resolve by their dasherized names']() {
      // (precompileTemplate needs a literal string: gxt compiles it at build time)
      const only = (template) => setComponentTemplate(template, templateOnly());
      this.owner.register('component:foo-bar', only(precompileTemplate('foo-bar')));
      this.owner.register('component:x-blah', only(precompileTemplate('x-blah')));
      this.owner.register('component:foo', only(precompileTemplate('foo')));
      this.owner.register('component:foo/bar-baz', only(precompileTemplate('nested')));

      this.render('<FooBar />|<XBlah />|<X-Blah />|<Foo />|<Foo::BarBaz />');
      this.assertText('foo-bar|x-blah|x-blah|foo|nested');
      this.assertStableRerender();
    }

    ['@test a Glimmer component resolved by name gets args, blocks and ...attributes']() {
      class Greeting extends Component {
        get shout() {
          return this.args.name.toUpperCase();
        }
      }
      this.owner.register(
        'component:x-greeting',
        setComponentTemplate(
          precompileTemplate('<p ...attributes>{{this.shout}}:{{yield}}</p>'),
          Greeting
        )
      );

      this.render('<XGreeting @name={{this.name}} class="g">block</XGreeting>', { name: 'tom' });
      this.assertHTML('<p class="g">TOM:block</p>');

      runTask(() => set(this.context, 'name', 'zoey'));
      this.assertHTML('<p class="g">ZOEY:block</p>');
    }

    ['@test curly invocations: {{#foo-bar}}, {{foo-bar a=1}} and {{component "foo-bar"}}']() {
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('[{{@a}}{{yield "x"}}]'), templateOnly())
      );

      this.render(
        '{{#foo-bar a=1 as |v|}}{{v}}{{/foo-bar}}{{foo-bar a=2}}{{component "foo-bar" a=3}}{{#let (component "foo-bar" a=4) as |C|}}<C />{{/let}}'
      );
      this.assertText('[1x][2][3][4]');
      this.assertStableRerender();
    }

    ['@test a content {{name}} is a component, else a helper, else nothing']() {
      this.owner.register(
        'component:is-component',
        setComponentTemplate(precompileTemplate('C'), templateOnly())
      );
      this.registerHelper('is-helper', () => 'H');

      this.render('{{is-component}}|{{is-helper}}|{{nothing-here}}|{{concat "a" "b"}}');
      this.assertText('C|H||ab');
      this.assertStableRerender();
    }

    ['@test a helper by name is reactive in content, attributes and sub-expressions']() {
      this.registerHelper('shout', ([value]) => String(value).toUpperCase());

      this.render(
        '<p title={{shout this.v}} data-x="[{{shout this.v}}]">{{shout this.v}}{{#if (shout this.v)}}!{{/if}}</p>',
        { v: 'a' }
      );
      this.assertHTML('<p title="A" data-x="[A]">A!</p>');

      runTask(() => set(this.context, 'v', 'b'));
      this.assertHTML('<p title="B" data-x="[B]">B!</p>');
    }

    ['@test {{helper "name"}} curries a helper by name']() {
      this.registerHelper('hello-world', ([text]) => text ?? 'Hello, world!');

      this.render('[{{helper "hello-world"}}][{{helper (helper "hello-world") "wow"}}]');
      this.assertText('[Hello, world!][wow]');
    }

    ['@test element modifiers resolve by name']() {
      this.owner.register(
        'modifier:set-title',
        simpleModifier((element, [title]) => element.setAttribute('title', title))
      );

      this.render('<div {{set-title "t"}}></div>');
      this.assertHTML('<div title="t"></div>');
    }

    ['@test a by-name template-only component reached through a G10 precompileTemplate loose template']() {
      this.owner.register(
        'component:inner-one',
        setComponentTemplate(precompileTemplate('inner'), templateOnly())
      );
      this.owner.register(
        'component:outer-one',
        setComponentTemplate(precompileTemplate('<InnerOne />+{{yield}}'), templateOnly())
      );

      this.render('<OuterOne>y</OuterOne>');
      this.assertText('inner+y');
    }

    ['@test the Inspector names a by-name component node by its resolver name'](assert) {
      class Panel extends Component {}
      this.owner.register(
        'component:x-panel',
        setComponentTemplate(precompileTemplate('p'), Panel)
      );

      this.render('<XPanel />');

      const tree = this.owner.lookup('renderer:-dom').debugRenderTree.capture();
      const all = names(tree);
      assert.ok(all.includes('x-panel'), `named by the resolver name (${all.join(', ')})`);
      assert.notOk(all.includes('Panel'), 'not by its class name');
    }

    ["@test unresolvable: an unregistered <Component> raises Glimmer's error"](assert) {
      assert.throws(
        () => this.render('<NotRegistered />'),
        /Attempted to resolve `not-registered`, which was expected to be a component, but nothing was found\./
      );
    }

    ["@test unresolvable: an unregistered {{#block}} component raises Glimmer's error"](assert) {
      assert.throws(
        () => this.render('{{#not-a-component}}{{/not-a-component}}'),
        /Attempted to resolve `not-a-component`, which was expected to be a component, but nothing was found\./
      );
    }

    ["@test unresolvable: an unregistered {{name arg}} raises Glimmer's error"](assert) {
      assert.throws(
        () => this.render('{{missing-thing 1}}'),
        /Attempted to resolve `missing-thing`, which was expected to be a component or helper, but nothing was found\./
      );
    }

    ["@test unresolvable: an unregistered (helper) raises Glimmer's error"](assert) {
      assert.throws(
        () => this.render('{{if (missing-helper) "x"}}'),
        /Attempted to resolve `missing-helper`, which was expected to be a helper, but nothing was found\./
      );
    }

    ["@test unresolvable: an unregistered modifier raises Glimmer's error"](assert) {
      assert.throws(
        () => this.render('<div {{missing-modifier}}></div>'),
        /Attempted to resolve `missing-modifier`, which was expected to be a modifier, but nothing was found\./
      );
    }

    ["@test unresolvable: a free path raises Glimmer's error"](assert) {
      assert.throws(
        () => this.render('{{free.path}}'),
        /You attempted to render a path \(`\{\{free\.path\}\}`\), but free was not in scope/
      );
    }

    ['@test a lowercase tag stays an element; a tracked component re-renders']() {
      class Counter extends Component {
        @tracked count = 1;
      }
      let counter;
      this.owner.register(
        'component:x-counter',
        setComponentTemplate(
          precompileTemplate('<x-counter-label>{{this.count}}</x-counter-label>'),
          class extends Counter {
            constructor(owner, args) {
              super(owner, args);
              counter = this;
            }
          }
        )
      );

      this.render('<XCounter />');
      this.assertHTML('<x-counter-label>1</x-counter-label>');

      runTask(() => counter.count++);
      this.assertHTML('<x-counter-label>2</x-counter-label>');
    }

    ['@test a classic Helper class resolves to its factory (injections, recompute)']() {
      this.registerHelper('x-count', {
        compute() {
          return 'count';
        },
      });
      this.owner.register(
        'helper:x-fn',
        helper(() => 'fn')
      );
      this.render('{{x-count}}/{{x-fn}}');
      this.assertText('count/fn');
    }

    ['@test a built-in gxt lowers itself still refuses an overwriting registration: hash (DEBUG)'](
      assert
    ) {
      if (!DEBUG) {
        assert.expect(0);
        return;
      }
      this.registerHelper('hash', () => 'Nope');
      expectAssertion(() => {
        this.render('{{#let (hash a=1) as |h|}}{{h.a}}{{/let}}');
      }, /You attempted to overwrite the built-in helper "hash" which is not allowed/);
    }

    ['@test a built-in gxt lowers itself still refuses an overwriting registration: unique-id (DEBUG)'](
      assert
    ) {
      if (!DEBUG) {
        assert.expect(0);
        return;
      }
      this.registerHelper('unique-id', () => 'Nope');
      expectAssertion(() => {
        this.render('{{unique-id}}');
      }, /You attempted to overwrite the built-in helper "unique-id" which is not allowed/);
    }

    ['@test a block param named like a built-in is not a built-in']() {
      this.registerHelper('fn', () => 'Nope');
      this.render('{{#each this.list as |fn|}}{{fn}}{{/each}}', { list: ['a', 'b'] });
      this.assertText('ab');
    }
  }
);
