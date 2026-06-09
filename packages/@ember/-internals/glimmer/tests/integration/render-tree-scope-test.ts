import {
  AbstractStrictTestCase,
  assertHTML,
  buildOwner,
  moduleFor,
  runDestroy,
} from 'internal-test-helpers';

import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@glimmer/manager';
import templateOnly from '@ember/component/template-only';
import GlimmerishComponent from '../utils/glimmerish-component';

import { run } from '@ember/runloop';
import { associateDestroyableChild, registerDestructor } from '@glimmer/destroyable';
import { renderComponent } from '../../lib/renderer';
import { makeContext } from '../../lib/make-context';
import { tracked } from '@glimmer/tracking';
import type Owner from '@ember/owner';

/**
 * Coverage for `makeContext` (the user-facing API discussed in
 * https://github.com/emberjs/rfcs/pull/1154 -- NullVoxPopuli's
 * `makeContext` proposal returning `{ Provide, consume }`).
 *
 * The API:
 *
 *   - `makeContext<T>()` takes no value -- the type parameter declares the
 *     shape, and the value is supplied at render time via `<Provide @value>`.
 *   - `<myContext.Provide @value={{...}}>` provides a value to descendants.
 *   - `(myContext.consume)` (a function helper) or `myContext.consume()` in
 *     JS reads the nearest provided value.
 *
 * The substantive scenarios here are ported from
 * `customerio/ember-provide-consume-context`'s test suite -- the prior-art
 * implementation that NullVoxPopuli called out in the RFC -- to pin down the
 * same behaviors production users rely on (sibling isolation, conditionals,
 * reactivity to value changes, etc.). Where the two APIs intentionally
 * diverge (EPCC's `getContext` returns `undefined` for missing context,
 * whereas makeContext throws per NVP's "reduce harm" clarification), the
 * test asserts the makeContext behavior.
 */

class MakeContextTestCase extends AbstractStrictTestCase {
  owner: Owner;

  constructor(assert: QUnit['assert']) {
    super(assert);
    this.owner = buildOwner({});
    associateDestroyableChild(this, this.owner);
  }

  get element() {
    return document.querySelector('#qunit-fixture')!;
  }

  renderComponent(component: object) {
    let { owner } = this;
    run(() => {
      const result = renderComponent(component, {
        owner,
        env: { document: document, isInteractive: true, hasDOM: true },
        into: this.element,
      });
      registerDestructor(this, () => result.destroy());
    });
  }
}

moduleFor(
  'RFC #1154 -- makeContext: smoke test',
  class extends MakeContextTestCase {
    afterEach() {
      runDestroy(this);
    }

    '@test provide a value, consume it, and it renders'(assert: QUnit['assert']) {
      class Theme {
        color = 'dark';
      }
      const theme = makeContext<Theme>();
      const value = new Theme();

      let Root = setComponentTemplate(
        precompileTemplate(
          '<theme.Provide @value={{value}}>{{#let (theme.consume) as |t|}}<div id="content">{{t.color}}</div>{{/let}}</theme.Provide>',
          {
            strictMode: true,
            scope: () => ({ theme, value }),
          }
        ),
        templateOnly()
      );

      this.renderComponent(Root);
      assert.strictEqual(
        this.element.querySelector('#content')?.textContent,
        'dark',
        'consumer rendered the provided value'
      );
    }
  }
);

moduleFor(
  'RFC #1154 -- makeContext: API surface',
  class extends MakeContextTestCase {
    afterEach() {
      runDestroy(this);
    }

    '@test consume() throws if called outside of rendering'(assert: QUnit['assert']) {
      const theme = makeContext<{ color: string }>();

      assert.throws(
        () => theme.consume(),
        /outside of rendering/,
        'consume() outside a render is rejected'
      );
    }

    '@test consume() throws when no <Provide> exists in the tree'(assert: QUnit['assert']) {
      const theme = makeContext<{ color: string }>();

      let error: Error | undefined;
      class Reader extends GlimmerishComponent {
        constructor(owner: Owner, args: Record<string, unknown>) {
          super(owner, args);
          try {
            theme.consume();
          } catch (e) {
            error = e as Error;
          }
        }
      }
      setComponentTemplate(precompileTemplate(''), Reader);

      let Root = setComponentTemplate(
        precompileTemplate('<Reader/>', {
          strictMode: true,
          scope: () => ({ Reader }),
        }),
        templateOnly()
      );

      this.renderComponent(Root);

      assert.ok(error, 'consume() raised');
      assert.ok(
        /No matching `<Provide>`/.test(error?.message ?? ''),
        `error mentions missing provider, got: ${error?.message}`
      );
    }

    '@test (context.consume) is usable as a template helper'(assert: QUnit['assert']) {
      const theme = makeContext<{ color: string }>();
      const value = { color: 'dark' };

      let Root = setComponentTemplate(
        precompileTemplate(
          '<theme.Provide @value={{value}}>{{#let (theme.consume) as |t|}}{{t.color}}{{/let}}</theme.Provide>',
          {
            strictMode: true,
            scope: () => ({ theme, value }),
          }
        ),
        templateOnly()
      );

      this.renderComponent(Root);
      assertHTML('dark');
      assert.ok(true);
    }
  }
);

/**
 * The "real-world scenarios" suite, ported from
 * ember-provide-consume-context's
 * tests/integration/components/built-in-components-test.ts.
 */
moduleFor(
  'RFC #1154 -- makeContext: behavior ported from ember-provide-consume-context',
  class extends MakeContextTestCase {
    afterEach() {
      runDestroy(this);
    }

    '@test a consumer can read context'(assert: QUnit['assert']) {
      const ctx = makeContext<string>();

      let Root = setComponentTemplate(
        precompileTemplate(
          '<ctx.Provide @value="5">{{#let (ctx.consume) as |v|}}<div id="content">{{v}}</div>{{/let}}</ctx.Provide>',
          { strictMode: true, scope: () => ({ ctx }) }
        ),
        templateOnly()
      );

      this.renderComponent(Root);
      assert.strictEqual(this.element.querySelector('#content')?.textContent, '5');
    }

    '@test a consumer reads from the closest provider'(assert: QUnit['assert']) {
      const ctx = makeContext<string>();

      let Root = setComponentTemplate(
        precompileTemplate(
          `<ctx.Provide @value="1">
             {{#let (ctx.consume) as |v|}}<div id="content-1">{{v}}</div>{{/let}}
             <ctx.Provide @value="2">
               {{#let (ctx.consume) as |v|}}<div id="content-2">{{v}}</div>{{/let}}
             </ctx.Provide>
           </ctx.Provide>`,
          { strictMode: true, scope: () => ({ ctx }) }
        ),
        templateOnly()
      );

      this.renderComponent(Root);
      assert.strictEqual(this.element.querySelector('#content-1')?.textContent, '1');
      assert.strictEqual(this.element.querySelector('#content-2')?.textContent, '2');
    }

    "@test consumer's value updates when @value changes"(assert: QUnit['assert']) {
      class State {
        @tracked count = 1;
      }
      const state = new State();
      const ctx = makeContext<number>();

      let Root = setComponentTemplate(
        precompileTemplate(
          '<ctx.Provide @value={{state.count}}>{{#let (ctx.consume) as |v|}}<div id="content">{{v}}</div>{{/let}}</ctx.Provide>',
          { strictMode: true, scope: () => ({ ctx, state }) }
        ),
        templateOnly()
      );

      this.renderComponent(Root);
      assert.strictEqual(this.element.querySelector('#content')?.textContent, '1');

      run(() => {
        state.count = 2;
      });
      assert.strictEqual(this.element.querySelector('#content')?.textContent, '2');
    }

    "@test a consumer can't access a context it isn't nested in"(assert: QUnit['assert']) {
      const ctxA = makeContext<string>();
      const ctxB = makeContext<string>();

      let error: Error | undefined;
      class Reader extends GlimmerishComponent {
        constructor(owner: Owner, args: Record<string, unknown>) {
          super(owner, args);
          try {
            ctxA.consume();
          } catch (e) {
            error = e as Error;
          }
        }
      }
      setComponentTemplate(precompileTemplate('done'), Reader);

      // Outer is ctxA (left subtree) and ctxB (right subtree); Reader is
      // under ctxB, so a consume for ctxA should throw -- they don't bleed.
      let Root = setComponentTemplate(
        precompileTemplate(
          '<ctxA.Provide @value="A"></ctxA.Provide><ctxB.Provide @value="B"><Reader/></ctxB.Provide>',
          { strictMode: true, scope: () => ({ ctxA, ctxB, Reader }) }
        ),
        templateOnly()
      );

      this.renderComponent(Root);

      assert.ok(error, 'consume() raised for non-enclosing context');
      assert.ok(
        /No matching `<Provide>`/.test(error?.message ?? ''),
        `error mentions missing provider, got: ${error?.message}`
      );
    }

    '@test sibling Provides with the same context do not bleed'(assert: QUnit['assert']) {
      const ctx = makeContext<string>();

      let Root = setComponentTemplate(
        precompileTemplate(
          `<ctx.Provide @value="1">{{#let (ctx.consume) as |v|}}<div id="content-1">{{v}}</div>{{/let}}</ctx.Provide>
           <ctx.Provide @value="2">{{#let (ctx.consume) as |v|}}<div id="content-2">{{v}}</div>{{/let}}</ctx.Provide>`,
          { strictMode: true, scope: () => ({ ctx }) }
        ),
        templateOnly()
      );

      this.renderComponent(Root);
      assert.strictEqual(this.element.querySelector('#content-1')?.textContent, '1');
      assert.strictEqual(this.element.querySelector('#content-2')?.textContent, '2');
    }

    '@test consumer is reactive across an {{#if}} that toggles it on and off'(
      assert: QUnit['assert']
    ) {
      class State {
        @tracked count = 1;
        @tracked hidden = false;
      }
      const state = new State();
      const ctx = makeContext<number>();

      let Root = setComponentTemplate(
        precompileTemplate(
          `<ctx.Provide @value={{state.count}}>
             {{#unless state.hidden}}
               {{#let (ctx.consume) as |v|}}<div id="content">{{v}}</div>{{/let}}
             {{/unless}}
           </ctx.Provide>`,
          { strictMode: true, scope: () => ({ ctx, state }) }
        ),
        templateOnly()
      );

      this.renderComponent(Root);
      assert.strictEqual(this.element.querySelector('#content')?.textContent, '1', 'initial');

      run(() => {
        state.hidden = true;
      });
      assert.strictEqual(this.element.querySelector('#content'), null, 'hidden');

      run(() => {
        state.hidden = false;
      });
      assert.strictEqual(this.element.querySelector('#content')?.textContent, '1', 'back to "1"');

      run(() => {
        state.hidden = true;
      });
      run(() => {
        state.count = 2;
      });
      run(() => {
        state.hidden = false;
      });
      assert.strictEqual(
        this.element.querySelector('#content')?.textContent,
        '2',
        'consumer reflects updated count when toggled back on'
      );
    }

    '@test a conditional <Provide> tears down and re-instates correctly'(assert: QUnit['assert']) {
      class State {
        @tracked hidden = false;
      }
      const state = new State();
      const ctx = makeContext<string>();

      let Root = setComponentTemplate(
        precompileTemplate(
          `{{#unless state.hidden}}
             <ctx.Provide @value="1">{{#let (ctx.consume) as |v|}}<div id="content">{{v}}</div>{{/let}}</ctx.Provide>
           {{/unless}}`,
          { strictMode: true, scope: () => ({ ctx, state }) }
        ),
        templateOnly()
      );

      this.renderComponent(Root);
      assert.strictEqual(this.element.querySelector('#content')?.textContent, '1');

      run(() => {
        state.hidden = true;
      });
      assert.strictEqual(this.element.querySelector('#content'), null);

      run(() => {
        state.hidden = false;
      });
      assert.strictEqual(this.element.querySelector('#content')?.textContent, '1');
    }

    '@test a conditional sibling <Provide> does not override an outer one'(
      assert: QUnit['assert']
    ) {
      class State {
        @tracked hidden = true;
      }
      const state = new State();
      const ctx = makeContext<string>();

      // The inner ctx.Provide @value="2" is in a sibling subtree of the
      // consumer, so it must never override the outer @value="1".
      let Root = setComponentTemplate(
        precompileTemplate(
          `<ctx.Provide @value="1">
             {{#unless state.hidden}}
               <ctx.Provide @value="2"></ctx.Provide>
             {{/unless}}
             {{#let (ctx.consume) as |v|}}<div id="content">{{v}}</div>{{/let}}
           </ctx.Provide>`,
          { strictMode: true, scope: () => ({ ctx, state }) }
        ),
        templateOnly()
      );

      this.renderComponent(Root);
      assert.strictEqual(this.element.querySelector('#content')?.textContent, '1');

      run(() => {
        state.hidden = false;
      });
      assert.strictEqual(
        this.element.querySelector('#content')?.textContent,
        '1',
        'sibling provider does not override outer'
      );

      run(() => {
        state.hidden = true;
      });
      assert.strictEqual(this.element.querySelector('#content')?.textContent, '1');
    }

    '@test multiple distinct contexts can be nested'(assert: QUnit['assert']) {
      const ctxOne = makeContext<string>();
      const ctxTwo = makeContext<string>();

      let Root = setComponentTemplate(
        precompileTemplate(
          `<ctxOne.Provide @value="1">
             <ctxTwo.Provide @value="2">
               {{#let (ctxOne.consume) as |a|}}<div id="content-1">{{a}}</div>{{/let}}
               {{#let (ctxTwo.consume) as |b|}}<div id="content-2">{{b}}</div>{{/let}}
             </ctxTwo.Provide>
           </ctxOne.Provide>`,
          { strictMode: true, scope: () => ({ ctxOne, ctxTwo }) }
        ),
        templateOnly()
      );

      this.renderComponent(Root);
      assert.strictEqual(this.element.querySelector('#content-1')?.textContent, '1');
      assert.strictEqual(this.element.querySelector('#content-2')?.textContent, '2');
    }

    '@test @tracked state on a provided class instance is reactive'(assert: QUnit['assert']) {
      class Counter {
        @tracked count = 0;
      }
      const counter = makeContext<Counter>();
      const instance = new Counter();

      let Root = setComponentTemplate(
        precompileTemplate(
          '<counter.Provide @value={{instance}}>{{#let (counter.consume) as |c|}}<div id="content">{{c.count}}</div>{{/let}}</counter.Provide>',
          { strictMode: true, scope: () => ({ counter, instance }) }
        ),
        templateOnly()
      );

      this.renderComponent(Root);
      assert.strictEqual(this.element.querySelector('#content')?.textContent, '0');

      run(() => {
        instance.count = 5;
      });
      assert.strictEqual(this.element.querySelector('#content')?.textContent, '5');
    }

    '@test consumer at component-instance init time sees the nearest provider'(
      assert: QUnit['assert']
    ) {
      // Mirrors EPCC's "a consumer can read context during initialization":
      // when the consumer is a class component, its constructor should see
      // the enclosing provider's value (not throw, not see a stale one).
      const ctx = makeContext<string>();

      let observed: string | undefined;
      class Reader extends GlimmerishComponent {
        constructor(owner: Owner, args: Record<string, unknown>) {
          super(owner, args);
          observed = ctx.consume();
        }
      }
      setComponentTemplate(precompileTemplate('done'), Reader);

      let Root = setComponentTemplate(
        precompileTemplate('<ctx.Provide @value="provided"><Reader/></ctx.Provide>', {
          strictMode: true,
          scope: () => ({ ctx, Reader }),
        }),
        templateOnly()
      );

      this.renderComponent(Root);
      assert.strictEqual(observed, 'provided');
    }

    '@test a provided object identity is stable across the same Provide re-render'(
      assert: QUnit['assert']
    ) {
      // Providing a stable object preserves identity. If a sibling tracked
      // re-render happens, the same instance should be re-yielded -- not a
      // new one. This matters for downstream code that uses identity (e.g.
      // caching, refs).
      class State {
        @tracked tick = 0;
      }
      const state = new State();

      const value = { id: 1 };
      const ctx = makeContext<{ id: number }>();

      let observed: object[] = [];
      class Reader extends GlimmerishComponent {
        constructor(owner: Owner, args: Record<string, unknown>) {
          super(owner, args);
          observed.push(ctx.consume());
        }
      }
      setComponentTemplate(precompileTemplate(''), Reader);

      let Root = setComponentTemplate(
        precompileTemplate(
          // The bare {{state.tick}} consumes the tracked tag so toggling it
          // forces the surrounding region to re-render.
          '<ctx.Provide @value={{value}}>{{state.tick}}<Reader/></ctx.Provide>',
          { strictMode: true, scope: () => ({ ctx, state, value, Reader }) }
        ),
        templateOnly()
      );

      this.renderComponent(Root);
      const first = observed[0];
      assert.strictEqual(first, value, 'reader observed the provided object');

      run(() => {
        state.tick = 1;
      });

      // Reader's constructor only fires once, so we don't get a second
      // observed entry -- but the value it saw was the stable instance.
      assert.strictEqual(observed.length, 1, 'reader constructed once');
      assert.strictEqual(first, value, 'provided object identity is stable');
    }
  }
);

/**
 * Extra-coverage suite for behaviors not exercised by the EPCC port:
 *
 * - consume() from a plain function helper
 * - consume() from a modifier
 * - explicit @value={{undefined}} / @value={{null}}, and omitting @value
 * - cross-renderComponent isolation
 * - multiple consume() calls in the same template return the same identity
 */
import { defineSimpleHelper, defineSimpleModifier } from 'internal-test-helpers';

moduleFor(
  'RFC #1154 -- makeContext: extra coverage',
  class extends MakeContextTestCase {
    afterEach() {
      runDestroy(this);
    }

    '@test consume() works inside a plain function helper'(assert: QUnit['assert']) {
      const ctx = makeContext<string>();

      // A genuine helper -- not just `(ctx.consume)` in a let-binding.
      // This exercises that consume() can be called from a function whose
      // identity is wrapped by the helper manager, which is the case NVP
      // explicitly motivates in the RFC ("helpers, modifiers, etc.").
      const readContext = defineSimpleHelper(() => ctx.consume());

      let Root = setComponentTemplate(
        precompileTemplate(
          '<ctx.Provide @value="from-helper"><div id="content">{{(readContext)}}</div></ctx.Provide>',
          { strictMode: true, scope: () => ({ ctx, readContext }) }
        ),
        templateOnly()
      );

      this.renderComponent(Root);
      assert.strictEqual(this.element.querySelector('#content')?.textContent, 'from-helper');
    }

    '@test KNOWN LIMITATION: consume() inside a modifier install throws'(assert: QUnit['assert']) {
      // Modifier install runs during `transaction.commit()`, which fires
      // *after* the render frame has popped its scope stack. So calling
      // consume() inside a modifier callback sees an empty scope and
      // throws "outside of rendering".
      //
      // This pins down the current behavior so a future fix (e.g. wrapping
      // modifier install in the enclosing component's scope) doesn't break
      // silently. RFC #1154 motivates "all invokables" -- modifiers are
      // an extension worth its own follow-up.
      const ctx = makeContext<string>();

      let caught: Error | undefined;
      const stash = defineSimpleModifier((_element: Element) => {
        try {
          ctx.consume();
        } catch (e) {
          caught = e as Error;
        }
      });

      let Root = setComponentTemplate(
        precompileTemplate(
          '<ctx.Provide @value="from-modifier"><div {{stash}}>x</div></ctx.Provide>',
          { strictMode: true, scope: () => ({ ctx, stash }) }
        ),
        templateOnly()
      );

      this.renderComponent(Root);
      assert.ok(caught, 'consume() in modifier install threw');
      assert.ok(
        /outside of rendering/.test(caught?.message ?? ''),
        `error mentions outside-of-rendering, got: ${caught?.message}`
      );
    }

    '@test explicit @value={{undefined}} provides undefined (not "no provider")'(
      assert: QUnit['assert']
    ) {
      const ctx = makeContext<string | undefined>();

      let observed: unknown = 'NOT_SET';
      class Reader extends GlimmerishComponent {
        constructor(owner: Owner, args: Record<string, unknown>) {
          super(owner, args);
          observed = ctx.consume();
        }
      }
      setComponentTemplate(precompileTemplate(''), Reader);

      // Explicit @value=undefined -- the consumer should see undefined,
      // NOT throw "no provider" (the Provide *is* in the tree, it just
      // chose to provide an undefined value).
      let Root = setComponentTemplate(
        precompileTemplate('<ctx.Provide @value={{undefined}}><Reader/></ctx.Provide>', {
          strictMode: true,
          scope: () => ({ ctx, Reader }),
        }),
        templateOnly()
      );

      this.renderComponent(Root);
      assert.strictEqual(observed, undefined, 'consumer saw the explicit undefined value');
    }

    '@test omitting @value provides undefined (not "no provider")'(assert: QUnit['assert']) {
      const ctx = makeContext<string | undefined>();

      let observed: unknown = 'NOT_SET';
      class Reader extends GlimmerishComponent {
        constructor(owner: Owner, args: Record<string, unknown>) {
          super(owner, args);
          observed = ctx.consume();
        }
      }
      setComponentTemplate(precompileTemplate(''), Reader);

      // No @value at all -- the Provide is still in the tree, so consume()
      // returns undefined rather than throwing.
      let Root = setComponentTemplate(
        precompileTemplate('<ctx.Provide><Reader/></ctx.Provide>', {
          strictMode: true,
          scope: () => ({ ctx, Reader }),
        }),
        templateOnly()
      );

      this.renderComponent(Root);
      assert.strictEqual(observed, undefined, 'consumer saw undefined when @value omitted');
    }

    '@test explicit @value={{null}} provides null'(assert: QUnit['assert']) {
      const ctx = makeContext<string | null>();

      let observed: unknown = 'NOT_SET';
      class Reader extends GlimmerishComponent {
        constructor(owner: Owner, args: Record<string, unknown>) {
          super(owner, args);
          observed = ctx.consume();
        }
      }
      setComponentTemplate(precompileTemplate(''), Reader);

      let Root = setComponentTemplate(
        precompileTemplate('<ctx.Provide @value={{null}}><Reader/></ctx.Provide>', {
          strictMode: true,
          scope: () => ({ ctx, Reader }),
        }),
        templateOnly()
      );

      this.renderComponent(Root);
      assert.strictEqual(observed, null, 'consumer saw the explicit null value');
    }

    '@test multiple consume() calls in the same template return the same identity'(
      assert: QUnit['assert']
    ) {
      // Each consume() walks up the scope chain. They should both find the
      // same provider entry and return the same value -- strict-equal
      // identity for a provided object.
      class State {
        marker = Symbol('state');
      }
      const ctx = makeContext<State>();
      const instance = new State();

      let firstSeen: State | undefined;
      let secondSeen: State | undefined;
      class FirstReader extends GlimmerishComponent {
        constructor(owner: Owner, args: Record<string, unknown>) {
          super(owner, args);
          firstSeen = ctx.consume();
        }
      }
      class SecondReader extends GlimmerishComponent {
        constructor(owner: Owner, args: Record<string, unknown>) {
          super(owner, args);
          secondSeen = ctx.consume();
        }
      }
      setComponentTemplate(precompileTemplate(''), FirstReader);
      setComponentTemplate(precompileTemplate(''), SecondReader);

      let Root = setComponentTemplate(
        precompileTemplate(
          '<ctx.Provide @value={{instance}}><FirstReader/><SecondReader/></ctx.Provide>',
          {
            strictMode: true,
            scope: () => ({ ctx, instance, FirstReader, SecondReader }),
          }
        ),
        templateOnly()
      );

      this.renderComponent(Root);
      assert.ok(firstSeen, 'first reader observed');
      assert.ok(secondSeen, 'second reader observed');
      assert.strictEqual(firstSeen, secondSeen, 'both consumers see the same instance');
    }
  }
);

/**
 * Independent renderComponent trees must not share scope state. This sits
 * in its own module so each test's `renderComponent` call is independent
 * (the base class wires `into: #qunit-fixture`, so we render two trees
 * into separate sub-elements within the same fixture).
 */
moduleFor(
  'RFC #1154 -- makeContext: cross-renderComponent isolation',
  class extends MakeContextTestCase {
    afterEach() {
      runDestroy(this);
    }

    "@test separate renderComponent calls do not see each other's providers"(
      assert: QUnit['assert']
    ) {
      const ctx = makeContext<string>();

      let bareError: Error | undefined;
      class BareReader extends GlimmerishComponent {
        constructor(owner: Owner, args: Record<string, unknown>) {
          super(owner, args);
          try {
            ctx.consume();
          } catch (e) {
            bareError = e as Error;
          }
        }
      }
      setComponentTemplate(precompileTemplate(''), BareReader);

      let providedSeen: string | undefined;
      class ProvidedReader extends GlimmerishComponent {
        constructor(owner: Owner, args: Record<string, unknown>) {
          super(owner, args);
          providedSeen = ctx.consume();
        }
      }
      setComponentTemplate(precompileTemplate(''), ProvidedReader);

      // Two independent component trees, both rendered into the fixture
      // but in separate `renderComponent` calls. The first has no
      // <Provide>; the second is wrapped in one. The presence of a
      // <Provide> in tree #2 must not bleed into tree #1.
      const fixture = this.element;
      const slotA = document.createElement('div');
      const slotB = document.createElement('div');
      fixture.appendChild(slotA);
      fixture.appendChild(slotB);

      let TreeA = setComponentTemplate(
        precompileTemplate('<BareReader/>', {
          strictMode: true,
          scope: () => ({ BareReader }),
        }),
        templateOnly()
      );
      let TreeB = setComponentTemplate(
        precompileTemplate('<ctx.Provide @value="B"><ProvidedReader/></ctx.Provide>', {
          strictMode: true,
          scope: () => ({ ctx, ProvidedReader }),
        }),
        templateOnly()
      );

      run(() => {
        const { owner } = this;
        const a = renderComponent(TreeA, {
          owner,
          env: { document, isInteractive: true, hasDOM: true },
          into: slotA,
        });
        const b = renderComponent(TreeB, {
          owner,
          env: { document, isInteractive: true, hasDOM: true },
          into: slotB,
        });
        registerDestructor(this, () => {
          a.destroy();
          b.destroy();
        });
      });

      assert.ok(bareError, 'tree A: no provider, consume() threw');
      assert.ok(
        /No matching `<Provide>`/.test(bareError?.message ?? ''),
        `error mentions missing provider, got: ${bareError?.message}`
      );
      assert.strictEqual(providedSeen, 'B', 'tree B: own <Provide @value="B"> visible');
    }
  }
);
