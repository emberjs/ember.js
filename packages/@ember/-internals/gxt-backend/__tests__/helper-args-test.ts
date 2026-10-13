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
 *   `renderComponent` root in the middle of the sync;
 * - an `(fn …)` passed directly as an argument (`@f={{fn this.greet "x"}}`) was
 *   a new function on every read, so every sync saw an argument change, wrote
 *   it back and dirtied the argument, which scheduled the next sync.
 *
 * Glimmer semantics: helper arguments are references; a helper re-computes only
 * when an argument it consumed changed; reading a helper never writes reactive
 * state; a `(hash)` / `(array)` is the same object until something it read
 * changes; an `(fn …)` is one function per call site, which reads the callback
 * and the partial arguments when it is called.
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
import ClassicComponent from '@ember/component';
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

    async '@test a (fn) argument passed directly to a component'() {
      this.registerHelper('call-it', ([fn]) => (fn as () => string)());
      this.registerComponent('test-harness', precompileTemplate('[{{call-it @f}}]'), {
        glimmer: true,
      });

      const root = await this.render(
        precompileTemplate('<TestHarness @f={{fn this.greet "x"}} />{{this.other}}'),
        class extends GlimmerComponent {
          greet = (value: string) => `hi ${value}`;
          @tracked other = 'a';
        }
      );
      assertHTML('[hi x]a');

      root.other = 'b';
      await renderSettled();
      assertHTML('[hi x]b');
    }

    async '@test a (fn) argument passed directly to a component updates when a partial argument changes'() {
      this.registerHelper('call-it', ([fn]) => (fn as () => string)());
      this.registerComponent('test-harness', precompileTemplate('[{{call-it @f}}]'), {
        glimmer: true,
      });

      const root = await this.render(
        precompileTemplate('<TestHarness @f={{fn this.greet this.name}} />'),
        class extends GlimmerComponent {
          greet = (value: string) => `hi ${value}`;
          @tracked name = 'x';
        }
      );
      assertHTML('[hi x]');

      root.name = 'y';
      await renderSettled();
      assertHTML('[hi y]');
    }

    async '@test a (fn) argument passed directly to a template-only component'() {
      this.registerHelper('call-it', ([fn]) => (fn as () => string)());
      this.registerComponent('test-harness', precompileTemplate('[{{call-it @f}}]'));

      const root = await this.render(
        precompileTemplate('<TestHarness @f={{fn this.greet "x"}} />{{this.other}}'),
        class extends GlimmerComponent {
          greet = (value: string) => `hi ${value}`;
          @tracked other = 'a';
        }
      );
      assertHTML('[hi x]a');

      root.other = 'b';
      await renderSettled();
      assertHTML('[hi x]b');
    }

    async '@test a (fn (mut …)) argument passed directly to a component'() {
      let setValue: ((value: string) => void) | undefined;
      this.owner.register(
        'component:test-harness',
        setComponentTemplate(
          precompileTemplate('[{{@value}}]'),
          class extends GlimmerComponent<{ f: (value: string) => void }> {
            constructor(owner: Owner, args: { f: (value: string) => void; value: string }) {
              super(owner, args);
              setValue = (value) => this.args.f(value);
            }
          }
        )
      );

      await this.render(
        precompileTemplate('<TestHarness @f={{fn (mut this.value)}} @value={{this.value}} />'),
        class extends GlimmerComponent {
          @tracked value = 'a';
        }
      );
      assertHTML('[a]');

      setValue!('b');
      await renderSettled();
      assertHTML('[b]');
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

    ['@test a (fn) argument is the same function while its inputs are unchanged'](
      assert: QUnit['assert']
    ) {
      const seen: unknown[] = [];
      this.registerUserHelper('record-fn', ([fn]) => {
        seen.push(fn);
        return (fn as () => string)();
      });
      this.registerTemplateOnly('baz', precompileTemplate('[{{record-fn @f}}][{{@other}}]'));

      this.render('<Baz @f={{fn this.greet "x"}} @other={{this.other}} />', {
        greet: (value: string) => `hi ${value}`,
        other: 'a',
      });
      this.assertText('[hi x][a]');

      runTask(() => set(this.context, 'other', 'b'));
      this.assertText('[hi x][b]');
      assert.ok(seen.length >= 1, 'record-fn was computed');
      assert.true(
        seen.every((fn) => fn === seen[0]),
        `one function for the call site (${seen.length} computes)`
      );
    }

    ['@test a (fn) argument with a changed callback calls the new callback']() {
      this.registerUserHelper('call-it', ([fn]) => (fn as () => string)());
      this.registerTemplateOnly('baz', precompileTemplate('[{{call-it @f}}]'));

      this.render('<Baz @f={{fn this.callback "x"}} />', {
        callback: (value: string) => `A ${value}`,
      });
      this.assertText('[A x]');

      runTask(() => set(this.context, 'callback', (value: string) => `B ${value}`));
      this.assertText('[B x]');
    }

    ['@test a (fn) argument of a classic component is the same function while its inputs are unchanged'](
      assert: QUnit['assert']
    ) {
      const seen: unknown[] = [];
      this.registerUserHelper('record-fn', ([fn]) => {
        seen.push(fn);
        return (fn as () => string)();
      });
      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(
          precompileTemplate('[{{record-fn this.f}}][{{this.other}}]'),
          class extends ClassicComponent {}
        )
      );

      this.render('{{foo-bar f=(fn this.greet "x") other=this.other}}', {
        greet: (value: string) => `hi ${value}`,
        other: 'a',
      });
      this.assertText('[hi x][a]');

      runTask(() => set(this.context, 'other', 'b'));
      this.assertText('[hi x][b]');
      assert.true(
        seen.every((fn) => fn === seen[0]),
        `one function for the call site (${seen.length} computes)`
      );
    }

    ['@test a (fn) argument passes its current arguments when invoked'](assert: QUnit['assert']) {
      let stashed: ((...args: unknown[]) => unknown) | undefined;
      class Stash extends GlimmerComponent<{ f: (...args: unknown[]) => unknown }> {
        constructor(owner: Owner, args: { f: (...args: unknown[]) => unknown }) {
          super(owner, args);
          stashed = this.args.f;
        }
      }
      this.owner.register('component:stash', setComponentTemplate(precompileTemplate(''), Stash));

      this.render('<Stash @f={{fn this.greet this.name}} />', {
        greet: (value: string) => `hi ${value}`,
        name: 'a',
      });
      assert.strictEqual(stashed?.(), 'hi a');

      runTask(() => set(this.context, 'name', 'b'));
      assert.strictEqual(stashed?.(), 'hi b', 'the stashed function reads the current argument');
    }
  }
);
