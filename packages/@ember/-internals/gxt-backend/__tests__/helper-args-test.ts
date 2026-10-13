/**
 * Helper results, functions and `(hash)` / `(array)` values as component
 * arguments (compat, GXT_MODE).
 *
 * Regression tests for renderer hangs that the `[integration]` suites hit once
 * main's harness started rendering through `renderComponent` and registering
 * every helper as a public `setHelperManager` definition:
 *
 * - an owner-registered helper's result passed as an argument
 *   (`<Bar @content={{(foo)}} />`, `<Bar @content="{{foo}}" />`) looped forever:
 *   reading the cached custom-manager helper wrote its args on every evaluation
 *   (no comparison when an argument was a function), which dirtied a tag the
 *   reading formula had consumed;
 * - a `(hash)` / `(array)` argument with a `(component)`, `(hash)` or `(array)`
 *   member got a new identity on every read after any change, so every sync saw
 *   an argument change, and the change's write-back re-rendered the
 *   `renderComponent` root in the middle of the sync.
 *
 * Glimmer semantics: helper arguments are references; a helper re-computes only
 * when an argument it consumed changed; reading a helper never writes reactive
 * state; a `(hash)` / `(array)` is the same object until something it read
 * changes.
 *
 * The first module renders through the public `renderComponent` with a
 * loose-mode template, as the `[integration]` harness does (helpers and
 * components resolve from the owner); the root is a Glimmer component class
 * (the harness's custom-manager plain-object root gets no `this` under GXT, a
 * separate gap). A `renderComponent` root re-renders as a whole on a classic
 * mutation under GXT, so the re-computation counts are asserted in the second
 * module, which renders through the classic `RenderingTestCase#render`.
 *
 * The test page loads this file only in GXT builds (`virtual:gxt-tests`).
 */
import {
  AbstractStrictTestCase,
  assertHTML,
  buildOwner,
  moduleFor,
  RenderingTestCase,
  runTask,
} from 'internal-test-helpers';
import templateOnly from '@ember/component/template-only';
import { capabilities as helperCapabilities, setHelperManager } from '@ember/helper';
import { A } from '@ember/array';
import { set } from '@ember/object';
import type Owner from '@ember/owner';
import { renderComponent, renderSettled } from '@ember/renderer';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@glimmer/manager';
import { associateDestroyableChild, destroy, registerDestructor } from '@glimmer/destroyable';
import GlimmerComponent from '@glimmer/component';
import { tracked } from '@glimmer/tracking';

type UserHelper = (positional: unknown[], named: Record<string, unknown>) => unknown;

// The `[integration]` harness's helper definition (integration-tests/lib/helpers.ts):
// a public `setHelperManager` definition whose `getValue` reads the args.
class UserHelperManager {
  capabilities = helperCapabilities('3.23', { hasValue: true });

  createHelper(definition: { helper: UserHelper }, args: any) {
    return { helper: definition.helper, args };
  }

  getValue({ helper, args }: { helper: UserHelper; args: any }) {
    return helper([...args.positional], { ...args.named });
  }
}
const USER_HELPER_MANAGER = new UserHelperManager();

function defineUserHelper(helper: UserHelper): object {
  return setHelperManager(() => USER_HELPER_MANAGER, { helper });
}

function greet() {
  return 'hi';
}

class RenderComponentRootTestCase extends AbstractStrictTestCase {
  owner: Owner;

  constructor(assert: QUnit['assert']) {
    super(assert);
    this.owner = buildOwner({});
    associateDestroyableChild(this, this.owner);
  }

  get element(): Element {
    return document.querySelector('#qunit-fixture')!;
  }

  async afterEach() {
    destroy(this);
    await renderSettled();
  }

  registerHelper(name: string, helper: UserHelper): void {
    this.owner.register(`helper:${name}`, defineUserHelper(helper), { instantiate: false });
  }

  // A template-only component, or with `glimmer: true` a Glimmer component
  // class (the harness's `TemplateOnly` / `Glimmer` kinds).
  registerComponent(name: string, template: object, { glimmer = false } = {}): void {
    const definition = glimmer ? class extends GlimmerComponent {} : templateOnly();
    this.owner.register(`component:${name}`, setComponentTemplate(template as any, definition));
  }

  // Renders `Root` (default: an empty Glimmer component) with `template` as its
  // loose-mode layout, waits for the render to settle and returns the root.
  async render<T extends object>(
    template: object,
    Root: new (owner: Owner, args: object) => T = class extends GlimmerComponent {} as any
  ): Promise<T> {
    let instance: T | undefined;
    const Captured = class extends (Root as any) {
      constructor(owner: Owner, args: object) {
        super(owner, args);
        instance = this as unknown as T;
      }
    };
    setComponentTemplate(template as any, Captured);
    const result = renderComponent(Captured, { owner: this.owner, into: this.element });
    registerDestructor(this, () => result.destroy());
    await renderSettled();
    return instance!;
  }
}

moduleFor(
  'GXT helper args: renderComponent roots settle',
  class extends RenderComponentRootTestCase {
    async '@test an owner helper invoked with parens as a named argument'() {
      this.registerHelper('is-string', ([value]) => typeof value === 'string');
      this.registerHelper('foo', () => 'Hello, world!');
      this.registerComponent('bar', precompileTemplate('[{{is-string @content}}][{{@content}}]'));

      const root = await this.render(
        precompileTemplate('<Bar @content={{(foo)}} />{{this.other}}'),
        class extends GlimmerComponent {
          @tracked other = 'a';
        }
      );
      assertHTML('[true][Hello, world!]a');

      root.other = 'b';
      await renderSettled();
      assertHTML('[true][Hello, world!]b');
    }

    async '@test an owner helper invoked with quotes as a named argument'() {
      this.registerHelper('is-string', ([value]) => typeof value === 'string');
      this.registerHelper('foo', () => 'Hello, world!');
      this.registerComponent('bar', precompileTemplate('[{{is-string @content}}][{{@content}}]'));

      await this.render(precompileTemplate('<Bar @content="{{foo}}" />'));
      assertHTML('[true][Hello, world!]');
    }

    async '@test a function-valued helper argument that stays the same'() {
      this.registerHelper('call-it', ([fn]) => (fn as () => string)());
      this.registerComponent('baz', precompileTemplate('[{{call-it @fn}}][{{@other}}]'));

      const root = await this.render(
        precompileTemplate('<Baz @fn={{this.fn}} @other={{this.other}} />'),
        class extends GlimmerComponent {
          fn = greet;
          @tracked other = 'a';
        }
      );
      assertHTML('[hi][a]');

      root.other = 'b';
      await renderSettled();
      assertHTML('[hi][b]');
    }

    async '@test a function-valued helper argument that changes'() {
      this.registerHelper('call-it', ([fn]) => (fn as () => string)());
      this.registerComponent('baz', precompileTemplate('[{{call-it @fn}}]'));

      const root = await this.render(
        precompileTemplate('<Baz @fn={{this.fn}} />'),
        class extends GlimmerComponent {
          @tracked fn = function greetA() {
            return 'A';
          };
        }
      );
      assertHTML('[A]');

      root.fn = function greetB() {
        return 'B';
      };
      await renderSettled();
      assertHTML('[B]');
    }

    async '@test a helper whose result is a new object, as a named argument'() {
      this.registerHelper('make-obj', () => ({ a: 1 }));
      this.registerComponent('test-harness', precompileTemplate('[{{@o.a}}]'), { glimmer: true });

      await this.render(precompileTemplate('<TestHarness @o={{(make-obj)}} />'));
      assertHTML('[1]');
    }

    async '@test a nested (hash Foo=(component "foo")) argument'() {
      this.registerComponent('foo', precompileTemplate('hello world!'), { glimmer: true });
      this.registerComponent('test-harness', precompileTemplate('<@stuff.Foo />'), {
        glimmer: true,
      });

      await this.render(
        precompileTemplate('<TestHarness @stuff={{hash Foo=(component "foo")}} />')
      );
      assertHTML('hello world!');
    }

    async '@test a nested (hash Foo=(component "foo") …) argument updates when a member changes'() {
      this.registerComponent('foo', precompileTemplate('hello {{@name}}!'), { glimmer: true });
      this.registerComponent(
        'test-harness',
        precompileTemplate('<@stuff.Foo @name={{@stuff.name}} />'),
        { glimmer: true }
      );

      const root = await this.render(
        precompileTemplate('<TestHarness @stuff={{hash Foo=(component "foo") name=this.name}} />'),
        class extends GlimmerComponent {
          @tracked name = 'world';
        }
      );
      assertHTML('hello world!');

      root.name = 'there';
      await renderSettled();
      assertHTML('hello there!');
    }

    async '@test a (hash) argument with a nested (hash) member'() {
      this.registerComponent('test-harness', precompileTemplate('[{{@stuff.inner.a}}]'), {
        glimmer: true,
      });

      await this.render(precompileTemplate('<TestHarness @stuff={{hash inner=(hash a="x")}} />'));
      assertHTML('[x]');
    }

    async '@test a (hash) argument with an (array) member'() {
      this.registerComponent(
        'test-harness',
        precompileTemplate('[{{#each @stuff.list as |i|}}{{i}}{{/each}}]'),
        { glimmer: true }
      );

      await this.render(precompileTemplate('<TestHarness @stuff={{hash list=(array 1 2)}} />'));
      assertHTML('[12]');
    }

    async '@test an (array (component "foo")) argument'() {
      this.registerComponent('foo', precompileTemplate('hello world!'), { glimmer: true });
      this.registerComponent(
        'test-harness',
        precompileTemplate('{{#each @stuff as |C|}}<C />{{/each}}'),
        { glimmer: true }
      );

      await this.render(precompileTemplate('<TestHarness @stuff={{array (component "foo")}} />'));
      assertHTML('hello world!');
    }
  }
);

moduleFor(
  'GXT helper args: helper re-computation',
  class extends RenderingTestCase {
    registerUserHelper(name: string, helper: UserHelper): void {
      this.owner.register(`helper:${name}`, defineUserHelper(helper), { instantiate: false });
    }

    registerTemplateOnly(name: string, template: object): void {
      this.owner.register(
        `component:${name}`,
        setComponentTemplate(template as any, templateOnly())
      );
    }

    ['@test an owner helper result passed as an argument is not re-computed by an unrelated change'](
      assert: QUnit['assert']
    ) {
      let fooCalls = 0;
      this.registerUserHelper('is-string', ([value]) => typeof value === 'string');
      this.registerUserHelper('foo', () => {
        fooCalls++;
        return 'Hello, world!';
      });
      this.registerTemplateOnly(
        'bar',
        precompileTemplate('[{{is-string @content}}][{{@content}}]')
      );

      this.render('<Bar @content={{(foo)}} />{{this.other}}', { other: 'a' });
      this.assertText('[true][Hello, world!]a');
      const afterRender = fooCalls;
      assert.ok(afterRender >= 1, 'foo was computed');

      runTask(() => set(this.context, 'other', 'b'));
      this.assertText('[true][Hello, world!]b');
      assert.strictEqual(fooCalls, afterRender, 'an unrelated change does not re-compute foo');
    }

    ['@test a function-valued argument that stays the same does not re-compute the helper'](
      assert: QUnit['assert']
    ) {
      let calls = 0;
      this.registerUserHelper('call-it', ([fn]) => {
        calls++;
        return (fn as () => string)();
      });
      this.registerTemplateOnly('baz', precompileTemplate('[{{call-it @fn}}][{{@other}}]'));

      this.render('<Baz @fn={{this.fn}} @other={{this.other}} />', { fn: greet, other: 'a' });
      this.assertText('[hi][a]');
      const afterRender = calls;
      assert.ok(afterRender >= 1, 'call-it was computed');

      runTask(() => set(this.context, 'other', 'b'));
      this.assertText('[hi][b]');
      assert.strictEqual(calls, afterRender, 'the same function does not re-compute the helper');
    }

    ['@test a function-valued argument that changes re-computes the helper once per change'](
      assert: QUnit['assert']
    ) {
      let calls = 0;
      this.registerUserHelper('call-it', ([fn]) => {
        calls++;
        return (fn as () => string)();
      });
      this.registerTemplateOnly('baz', precompileTemplate('[{{call-it @fn}}]'));

      const greetA = function greetA() {
        return 'A';
      };
      const greetB = function greetB() {
        return 'B';
      };
      this.render('<Baz @fn={{this.fn}} />', { fn: greetA });
      this.assertText('[A]');
      const afterRender = calls;

      runTask(() => set(this.context, 'fn', greetB));
      this.assertText('[B]');
      assert.strictEqual(calls, afterRender + 1, 'a new function re-computes the helper once');

      runTask(() => set(this.context, 'fn', greetB));
      this.assertText('[B]');
      assert.strictEqual(calls, afterRender + 1, 'the same function again does not re-compute');

      runTask(() => set(this.context, 'fn', greetA));
      this.assertText('[A]');
      assert.strictEqual(calls, afterRender + 2, 'switching back re-computes once more');
    }

    ['@test an Ember array argument changed in place re-computes the helper']() {
      this.registerUserHelper('join-words', ([list]) => (list as string[]).join(','));

      this.render('{{join-words this.list}}', { list: A(['a', 'b']) });
      this.assertText('a,b');

      runTask(() => this.context.list.pushObject('c'));
      this.assertText('a,b,c');
    }

    ['@test one helper invoked at two sites with different arguments']() {
      this.registerUserHelper('shout', ([value]) => String(value).toUpperCase());

      this.render('[{{shout "a"}}][{{shout this.word}}]', { word: 'b' });
      this.assertText('[A][B]');

      runTask(() => set(this.context, 'word', 'c'));
      this.assertText('[A][C]');
    }
  }
);
