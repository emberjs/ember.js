import {
  AbstractStrictTestCase,
  assertHTML,
  buildOwner,
  defineSimpleHelper,
  defineSimpleModifier,
  moduleFor,
  RenderingTestCase,
  runTask,
} from 'internal-test-helpers';

import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@glimmer/manager';
import templateOnly from '@ember/component/template-only';
import GlimmerishComponent from '@glimmer/component';

import { run } from '@ember/runloop';
import { associateDestroyableChild, registerDestructor } from '@glimmer/destroyable';
import { renderComponent } from '../../lib/renderer';
import { createContext } from '../../lib/create-context';
import { tracked } from '@glimmer/tracking';
import type Owner from '@ember/owner';

/**
 * RFC #1200: `createContext` returns `{ Provide, value }`.
 *
 * Most scenarios come from the test suite of ember-provide-consume-context.
 * Where the APIs differ on purpose, the tests assert the RFC behavior:
 * a read without a provider throws, it does not return `undefined`.
 */

class CreateContextTestCase extends AbstractStrictTestCase {
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
  'RFC #1200 -- createContext: smoke test',
  class extends CreateContextTestCase {
    '@test provide a value, consume it, and it renders'(assert: QUnit['assert']) {
      class Theme {
        color = 'dark';
      }
      const theme = createContext<Theme>();
      const value = new Theme();

      let Root = setComponentTemplate(
        precompileTemplate(
          '<theme.Provide @value={{value}}>{{#let theme.value as |t|}}<div id="content">{{t.color}}</div>{{/let}}</theme.Provide>',
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
  'RFC #1200 -- createContext: API surface',
  class extends CreateContextTestCase {
    '@test value throws if read outside of rendering'(assert: QUnit['assert']) {
      const theme = createContext<{ color: string }>();

      assert.throws(
        () => theme.value,
        /outside of rendering/,
        'a value read outside a render is rejected'
      );
    }

    '@test value throws when no <Provide> exists in the tree'(assert: QUnit['assert']) {
      const theme = createContext<{ color: string }>();

      let error: Error | undefined;
      class Reader extends GlimmerishComponent {
        constructor(owner: Owner, args: Record<string, unknown>) {
          super(owner, args);
          try {
            void theme.value;
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

      assert.ok(error, 'the value read raised');
      assert.ok(
        /No matching `<Provide>`/.test(error?.message ?? ''),
        `error mentions missing provider, got: ${error?.message}`
      );
    }

    '@test context.value is usable as a template path'(assert: QUnit['assert']) {
      const theme = createContext<{ color: string }>();
      const value = { color: 'dark' };

      /**
       * `value` works in a path and through a `{{#let}}` binding.
       */
      let Root = setComponentTemplate(
        precompileTemplate(
          '<theme.Provide @value={{value}}>{{theme.value.color}}-{{#let theme.value as |t|}}{{t.color}}{{/let}}</theme.Provide>',
          {
            strictMode: true,
            scope: () => ({ theme, value }),
          }
        ),
        templateOnly()
      );

      this.renderComponent(Root);
      assertHTML('dark-dark');
      assert.ok(true);
    }
  }
);

/**
 * Ported from ember-provide-consume-context:
 * tests/integration/components/built-in-components-test.ts
 */
moduleFor(
  'RFC #1200 -- createContext: behavior ported from ember-provide-consume-context',
  class extends CreateContextTestCase {
    '@test a consumer can read context'(assert: QUnit['assert']) {
      const ctx = createContext<string>();

      let Root = setComponentTemplate(
        precompileTemplate(
          '<ctx.Provide @value="5">{{#let ctx.value as |v|}}<div id="content">{{v}}</div>{{/let}}</ctx.Provide>',
          { strictMode: true, scope: () => ({ ctx }) }
        ),
        templateOnly()
      );

      this.renderComponent(Root);
      assert.strictEqual(this.element.querySelector('#content')?.textContent, '5');
    }

    '@test a consumer reads from the closest provider'(assert: QUnit['assert']) {
      const ctx = createContext<string>();

      let Root = setComponentTemplate(
        precompileTemplate(
          `<ctx.Provide @value="1">
             {{#let ctx.value as |v|}}<div id="content-1">{{v}}</div>{{/let}}
             <ctx.Provide @value="2">
               {{#let ctx.value as |v|}}<div id="content-2">{{v}}</div>{{/let}}
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
      const ctx = createContext<number>();

      let Root = setComponentTemplate(
        precompileTemplate(
          '<ctx.Provide @value={{state.count}}>{{#let ctx.value as |v|}}<div id="content">{{v}}</div>{{/let}}</ctx.Provide>',
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
      const ctxA = createContext<string>();
      const ctxB = createContext<string>();

      let error: Error | undefined;
      class Reader extends GlimmerishComponent {
        constructor(owner: Owner, args: Record<string, unknown>) {
          super(owner, args);
          try {
            void ctxA.value;
          } catch (e) {
            error = e as Error;
          }
        }
      }
      setComponentTemplate(precompileTemplate('done'), Reader);

      /**
       * Reader is under ctxB only.
       *
       * The ctxA provider is a sibling, so a read of ctxA throws.
       */
      let Root = setComponentTemplate(
        precompileTemplate(
          '<ctxA.Provide @value="A"></ctxA.Provide><ctxB.Provide @value="B"><Reader/></ctxB.Provide>',
          { strictMode: true, scope: () => ({ ctxA, ctxB, Reader }) }
        ),
        templateOnly()
      );

      this.renderComponent(Root);

      assert.ok(error, 'the value read raised for non-enclosing context');
      assert.ok(
        /No matching `<Provide>`/.test(error?.message ?? ''),
        `error mentions missing provider, got: ${error?.message}`
      );
    }

    '@test sibling Provides with the same context do not bleed'(assert: QUnit['assert']) {
      const ctx = createContext<string>();

      let Root = setComponentTemplate(
        precompileTemplate(
          `<ctx.Provide @value="1">{{#let ctx.value as |v|}}<div id="content-1">{{v}}</div>{{/let}}</ctx.Provide>
           <ctx.Provide @value="2">{{#let ctx.value as |v|}}<div id="content-2">{{v}}</div>{{/let}}</ctx.Provide>`,
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
      const ctx = createContext<number>();

      let Root = setComponentTemplate(
        precompileTemplate(
          `<ctx.Provide @value={{state.count}}>
             {{#unless state.hidden}}
               {{#let ctx.value as |v|}}<div id="content">{{v}}</div>{{/let}}
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
      const ctx = createContext<string>();

      let Root = setComponentTemplate(
        precompileTemplate(
          `{{#unless state.hidden}}
             <ctx.Provide @value="1">{{#let ctx.value as |v|}}<div id="content">{{v}}</div>{{/let}}</ctx.Provide>
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
      const ctx = createContext<string>();

      /**
       * The provider of "2" is a sibling of the reader.
       *
       * It never overrides the outer "1".
       */
      let Root = setComponentTemplate(
        precompileTemplate(
          `<ctx.Provide @value="1">
             {{#unless state.hidden}}
               <ctx.Provide @value="2"></ctx.Provide>
             {{/unless}}
             {{#let ctx.value as |v|}}<div id="content">{{v}}</div>{{/let}}
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
      const ctxOne = createContext<string>();
      const ctxTwo = createContext<string>();

      let Root = setComponentTemplate(
        precompileTemplate(
          `<ctxOne.Provide @value="1">
             <ctxTwo.Provide @value="2">
               {{#let ctxOne.value as |a|}}<div id="content-1">{{a}}</div>{{/let}}
               {{#let ctxTwo.value as |b|}}<div id="content-2">{{b}}</div>{{/let}}
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
      const counter = createContext<Counter>();
      const instance = new Counter();

      let Root = setComponentTemplate(
        precompileTemplate(
          '<counter.Provide @value={{instance}}>{{#let counter.value as |c|}}<div id="content">{{c.count}}</div>{{/let}}</counter.Provide>',
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
      /**
       * From ember-provide-consume-context:
       * "a consumer can read context during initialization".
       */
      const ctx = createContext<string>();

      let observed: string | undefined;
      class Reader extends GlimmerishComponent {
        constructor(owner: Owner, args: Record<string, unknown>) {
          super(owner, args);
          observed = ctx.value;
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
      /**
       * A re-render next to the reader keeps the provided object.
       *
       * Code that caches by identity depends on this.
       */
      class State {
        @tracked tick = 0;
      }
      const state = new State();

      const value = { id: 1 };
      const ctx = createContext<{ id: number }>();

      let observed: object[] = [];
      class Reader extends GlimmerishComponent {
        constructor(owner: Owner, args: Record<string, unknown>) {
          super(owner, args);
          observed.push(ctx.value);
        }
      }
      setComponentTemplate(precompileTemplate(''), Reader);

      let Root = setComponentTemplate(
        precompileTemplate(
          /**
           * The bare {{state.tick}} consumes the tracked tag so toggling it
           * forces the surrounding region to re-render.
           */
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

      /**
       * Reader's constructor only fires once, so we don't get a second
       * observed entry -- but the value it saw was the stable instance.
       */
      assert.strictEqual(observed.length, 1, 'reader constructed once');
      assert.strictEqual(first, value, 'provided object identity is stable');
    }
  }
);

/**
 * Behavior that the ported suite does not cover:
 *
 * - a read in a plain function helper
 * - a read in a modifier
 * - `@value={{undefined}}`, `@value={{null}}`, and no `@value`
 * - two reads of the same provider
 * - `{{#in-element}}`
 */
moduleFor(
  'RFC #1200 -- createContext: extra coverage',
  class extends CreateContextTestCase {
    '@test value works inside a plain function helper'(assert: QUnit['assert']) {
      const ctx = createContext<string>();

      /**
       * The RFC allows a read in the body of a plain function helper.
       */
      const readContext = defineSimpleHelper(() => ctx.value);

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

    '@test KNOWN LIMITATION: a value read inside a modifier install throws'(
      assert: QUnit['assert']
    ) {
      /**
       * Modifiers install when the transaction commits, after the VM is done.
       *
       * RFC #1200 documents this limitation.
       */
      const ctx = createContext<string>();

      let caught: Error | undefined;
      const stash = defineSimpleModifier((_element: Element) => {
        try {
          void ctx.value;
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
      assert.ok(caught, 'the value read in modifier install threw');
      assert.ok(
        /outside of rendering/.test(caught?.message ?? ''),
        `error mentions outside-of-rendering, got: ${caught?.message}`
      );
    }

    '@test explicit @value={{undefined}} provides undefined (not "no provider")'(
      assert: QUnit['assert']
    ) {
      const ctx = createContext<string | undefined>();

      let observed: unknown = 'NOT_SET';
      class Reader extends GlimmerishComponent {
        constructor(owner: Owner, args: Record<string, unknown>) {
          super(owner, args);
          observed = ctx.value;
        }
      }
      setComponentTemplate(precompileTemplate(''), Reader);

      /**
       * The provider is in the tree and provides `undefined`.
       *
       * That is not the "no provider" error.
       */
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
      const ctx = createContext<string | undefined>();

      let observed: unknown = 'NOT_SET';
      class Reader extends GlimmerishComponent {
        constructor(owner: Owner, args: Record<string, unknown>) {
          super(owner, args);
          observed = ctx.value;
        }
      }
      setComponentTemplate(precompileTemplate(''), Reader);

      /**
       * No @value at all -- the Provide is still in the tree, so value
       * is undefined rather than throwing.
       */
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
      const ctx = createContext<string | null>();

      let observed: unknown = 'NOT_SET';
      class Reader extends GlimmerishComponent {
        constructor(owner: Owner, args: Record<string, unknown>) {
          super(owner, args);
          observed = ctx.value;
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

    '@test multiple value reads in the same template return the same identity'(
      assert: QUnit['assert']
    ) {
      /**
       * Two reads find the same provider,
       * so they return the same object.
       */
      class State {
        marker = Symbol('state');
      }
      const ctx = createContext<State>();
      const instance = new State();

      let firstSeen: State | undefined;
      let secondSeen: State | undefined;
      class FirstReader extends GlimmerishComponent {
        constructor(owner: Owner, args: Record<string, unknown>) {
          super(owner, args);
          firstSeen = ctx.value;
        }
      }
      class SecondReader extends GlimmerishComponent {
        constructor(owner: Owner, args: Record<string, unknown>) {
          super(owner, args);
          secondSeen = ctx.value;
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

    '@test a value read works across {{#in-element}}'(assert: QUnit['assert']) {
      /**
       * `{{#in-element}}` moves the DOM, not the block in the render tree.
       *
       * The output lands in the div above the provider,
       * but the reads still see the provider.
       */
      const ctx = createContext<string>();

      let observedInConstructor: string | undefined;
      class Reader extends GlimmerishComponent {
        constructor(owner: Owner, args: Record<string, unknown>) {
          super(owner, args);
          observedInConstructor = ctx.value;
        }
      }
      setComponentTemplate(precompileTemplate(''), Reader);

      const findPortal = defineSimpleHelper(() => document.querySelector('#portal-target'));

      let Root = setComponentTemplate(
        precompileTemplate(
          `<div id="portal-target"></div>
           <ctx.Provide @value="through-the-portal">
             {{#in-element (findPortal)}}
               {{#let ctx.value as |v|}}<div id="content">{{v}}</div>{{/let}}
               <Reader/>
             {{/in-element}}
           </ctx.Provide>`,
          { strictMode: true, scope: () => ({ ctx, findPortal, Reader }) }
        ),
        templateOnly()
      );

      this.renderComponent(Root);
      assert.strictEqual(
        this.element.querySelector('#portal-target #content')?.textContent,
        'through-the-portal',
        'template path read inside the portal saw the outside provider'
      );
      assert.strictEqual(
        observedInConstructor,
        'through-the-portal',
        'component constructor inside the portal saw the outside provider'
      );
    }
  }
);

/**
 * Two `renderComponent` trees do not share providers.
 */
moduleFor(
  'RFC #1200 -- createContext: cross-renderComponent isolation',
  class extends CreateContextTestCase {
    "@test separate renderComponent calls do not see each other's providers"(
      assert: QUnit['assert']
    ) {
      const ctx = createContext<string>();

      let bareError: Error | undefined;
      class BareReader extends GlimmerishComponent {
        constructor(owner: Owner, args: Record<string, unknown>) {
          super(owner, args);
          try {
            void ctx.value;
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
          providedSeen = ctx.value;
        }
      }
      setComponentTemplate(precompileTemplate(''), ProvidedReader);

      /**
       * Tree A has no provider.
       *
       * The provider in tree B must not show in tree A.
       */
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

      assert.ok(bareError, 'tree A: no provider, the value read threw');
      assert.ok(
        /No matching `<Provide>`/.test(bareError?.message ?? ''),
        `error mentions missing provider, got: ${bareError?.message}`
      );
      assert.strictEqual(providedSeen, 'B', 'tree B: own <Provide @value="B"> visible');
    }
  }
);

/**
 * Reads that run again in an update.
 *
 * The append VM is gone then.
 * The updating VM replays each `-with-dynamic-vars` block of a `Provide`.
 */
moduleFor(
  'RFC #1200 -- createContext: updates',
  class extends CreateContextTestCase {
    '@test a getter that recomputes in an update sees the provider'(assert: QUnit['assert']) {
      class State {
        @tracked count = 1;
      }
      const state = new State();
      const ctx = createContext<string>();

      class Reader extends GlimmerishComponent {
        get label() {
          assert.step(`label reads ctx and count ${state.count}`);
          return `${ctx.value}-${state.count}`;
        }
      }
      setComponentTemplate(
        precompileTemplate('<div id="content">{{this.label}}</div>', { strictMode: true }),
        Reader
      );

      let Root = setComponentTemplate(
        precompileTemplate('<ctx.Provide @value="a"><Reader/></ctx.Provide>', {
          strictMode: true,
          scope: () => ({ ctx, Reader }),
        }),
        templateOnly()
      );

      this.renderComponent(Root);
      assert.strictEqual(this.element.querySelector('#content')?.textContent, 'a-1');
      assert.verifySteps(['label reads ctx and count 1']);

      run(() => {
        state.count = 2;
      });
      assert.strictEqual(this.element.querySelector('#content')?.textContent, 'a-2');
      assert.verifySteps(['label reads ctx and count 2']);
    }

    '@test helpers that recompute in an update see their nearest provider'(
      assert: QUnit['assert']
    ) {
      class State {
        @tracked count = 1;
      }
      const state = new State();
      const ctx = createContext<string>();

      const readContext = defineSimpleHelper((name, count) => {
        assert.step(`${String(name)} reads ctx and count ${String(count)}`);
        return `${ctx.value}-${String(count)}`;
      });

      let Root = setComponentTemplate(
        precompileTemplate(
          `<ctx.Provide @value="outer">
             <div id="before">{{readContext "before" state.count}}</div>
             <ctx.Provide @value="inner">
               <div id="inner">{{readContext "inner" state.count}}</div>
             </ctx.Provide>
             <div id="after">{{readContext "after" state.count}}</div>
           </ctx.Provide>`,
          { strictMode: true, scope: () => ({ ctx, readContext, state }) }
        ),
        templateOnly()
      );

      this.renderComponent(Root);
      assert.verifySteps([
        'before reads ctx and count 1',
        'inner reads ctx and count 1',
        'after reads ctx and count 1',
      ]);

      run(() => {
        state.count = 2;
      });
      assert.verifySteps([
        'before reads ctx and count 2',
        'inner reads ctx and count 2',
        'after reads ctx and count 2',
      ]);
      assert.strictEqual(this.element.querySelector('#before')?.textContent, 'outer-2');
      assert.strictEqual(this.element.querySelector('#inner')?.textContent, 'inner-2');
      assert.strictEqual(
        this.element.querySelector('#after')?.textContent,
        'outer-2',
        'the update left the inner provider'
      );
    }

    '@test a read in an update outside of every provider throws "no provider"'(
      assert: QUnit['assert']
    ) {
      class State {
        @tracked count = 1;
      }
      const state = new State();
      const ctx = createContext<string>();

      const readContext = defineSimpleHelper((count) => {
        try {
          return ctx.value;
        } catch (e) {
          assert.step(`count ${String(count)}: ${(e as Error).message.slice(0, 27)}`);
          return 'none';
        }
      });

      let Root = setComponentTemplate(
        precompileTemplate(
          '<ctx.Provide @value="a"></ctx.Provide><div id="content">{{readContext state.count}}</div>',
          { strictMode: true, scope: () => ({ ctx, readContext, state }) }
        ),
        templateOnly()
      );

      this.renderComponent(Root);
      assert.verifySteps(['count 1: No matching `<Provide>` was']);

      run(() => {
        state.count = 2;
      });
      assert.verifySteps(['count 2: No matching `<Provide>` was']);
    }

    '@test new {{#each}} items inside a provider see it'(assert: QUnit['assert']) {
      class State {
        @tracked items = ['a'];
      }
      const state = new State();
      const ctx = createContext<string>();

      const readContext = defineSimpleHelper((item) => {
        assert.step(`${String(item)} reads ctx`);
        return `${String(item)}:${ctx.value}`;
      });

      let Root = setComponentTemplate(
        precompileTemplate(
          `<ctx.Provide @value="p">{{#each state.items as |item|}}<span>{{readContext item}}</span>{{/each}}</ctx.Provide>`,
          { strictMode: true, scope: () => ({ ctx, readContext, state }) }
        ),
        templateOnly()
      );

      this.renderComponent(Root);
      assert.verifySteps(['a reads ctx']);

      run(() => {
        state.items = ['a', 'b'];
      });
      assert.verifySteps(['b reads ctx']);
      assert.strictEqual(this.element.textContent, 'a:pb:p');
    }
  }
);

moduleFor(
  'RFC #1200 -- createContext: classic root',
  class extends RenderingTestCase {
    '@test Provide and value work under a classic root'() {
      let ctx = createContext<string>();

      this.render('<this.ctx.Provide @value={{this.name}}>{{this.ctx.value}}</this.ctx.Provide>', {
        ctx,
        name: 'classic',
      });
      this.assertText('classic');

      runTask(() => this.context.set('name', 'updated'));
      this.assertText('updated');
    }
  }
);
