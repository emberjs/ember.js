import { RenderingTestCase, moduleFor, runTask } from 'internal-test-helpers';
import { setComponentTemplate } from '@glimmer/manager';
import { precompileTemplate } from '@ember/template-compilation';
import { template } from '@ember/template-compiler/runtime';

import { Component } from '../../utils/helpers';

import { set, computed } from '@ember/object';

moduleFor(
  'Helpers test: {{hash}}',
  class extends RenderingTestCase {
    ['@test returns a hash with the right key-value']() {
      this.render(`{{#let (hash name="Sergio") as |person|}}{{person.name}}{{/let}}`);

      this.assertText('Sergio');

      runTask(() => this.rerender());

      this.assertText('Sergio');
    }

    ['@test can be shadowed']() {
      let hash = (obj) =>
        Object.entries(obj)
          .map(([key, value]) => `hash:${key}=${value}`)
          .join(',');
      let Root = template(
        `({{hash apple='red' banana='yellow'}}) ({{#let shadowHash as |hash|}}{{hash apple='green'}}{{/let}})`,
        { scope: () => ({ hash, shadowHash: hash }) }
      );

      this.renderComponent(Root, {
        expect: '(hash:apple=red,hash:banana=yellow) (hash:apple=green)',
      });
    }

    ['@test can have more than one key-value']() {
      this.render(
        `{{#let (hash name="Sergio" lastName="Arbeo") as |person|}}{{person.name}} {{person.lastName}}{{/let}}`
      );

      this.assertText('Sergio Arbeo');

      runTask(() => this.rerender());

      this.assertText('Sergio Arbeo');
    }

    ['@test binds values when variables are used']() {
      this.render(
        `{{#let (hash name=this.model.firstName lastName="Arbeo") as |person|}}{{person.name}} {{person.lastName}}{{/let}}`,
        {
          model: {
            firstName: 'Marisa',
          },
        }
      );

      this.assertText('Marisa Arbeo');

      runTask(() => this.rerender());

      this.assertText('Marisa Arbeo');

      runTask(() => set(this.context, 'model.firstName', 'Sergio'));

      this.assertText('Sergio Arbeo');

      runTask(() => set(this.context, 'model', { firstName: 'Marisa' }));

      this.assertText('Marisa Arbeo');
    }

    ['@test binds multiple values when variables are used']() {
      this.render(
        `{{#let (hash name=this.model.firstName lastName=this.model.lastName) as |person|}}{{person.name}} {{person.lastName}}{{/let}}`,
        {
          model: {
            firstName: 'Marisa',
            lastName: 'Arbeo',
          },
        }
      );

      this.assertText('Marisa Arbeo');

      runTask(() => this.rerender());

      this.assertText('Marisa Arbeo');

      runTask(() => set(this.context, 'model.firstName', 'Sergio'));

      this.assertText('Sergio Arbeo');

      runTask(() => set(this.context, 'model.lastName', 'Smith'));

      this.assertText('Sergio Smith');

      runTask(() =>
        set(this.context, 'model', {
          firstName: 'Marisa',
          lastName: 'Arbeo',
        })
      );

      this.assertText('Marisa Arbeo');
    }

    ['@test hash helpers can be nested']() {
      this.render(
        `{{#let (hash person=(hash name=this.model.firstName)) as |ctx|}}{{ctx.person.name}}{{/let}}`,
        {
          model: { firstName: 'Balint' },
        }
      );

      this.assertText('Balint');

      runTask(() => this.rerender());

      this.assertText('Balint');

      runTask(() => set(this.context, 'model.firstName', 'Chad'));

      this.assertText('Chad');

      runTask(() => set(this.context, 'model', { firstName: 'Balint' }));

      this.assertText('Balint');
    }

    ['@test should yield hash of internal properties']() {
      let fooBarInstance;
      let FooBarComponent = class extends Component {
        init() {
          super.init(...arguments);
          fooBarInstance = this;
          this.model = { firstName: 'Chad' };
        }
      };

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(
          precompileTemplate(`{{yield (hash firstName=this.model.firstName)}}`),
          FooBarComponent
        )
      );

      this.render(`{{#foo-bar as |values|}}{{values.firstName}}{{/foo-bar}}`);

      this.assertText('Chad');

      runTask(() => this.rerender());

      this.assertText('Chad');

      runTask(() => set(fooBarInstance, 'model.firstName', 'Godfrey'));

      this.assertText('Godfrey');

      runTask(() => set(fooBarInstance, 'model', { firstName: 'Chad' }));

      this.assertText('Chad');
    }

    ['@test should yield hash of internal and external properties']() {
      let fooBarInstance;
      let FooBarComponent = class extends Component {
        init() {
          super.init(...arguments);
          fooBarInstance = this;
          this.model = { firstName: 'Chad' };
        }
      };

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(
          precompileTemplate(
            `{{yield (hash firstName=this.model.firstName lastName=this.lastName)}}`
          ),
          FooBarComponent
        )
      );

      this.render(
        `{{#foo-bar lastName=this.model.lastName as |values|}}{{values.firstName}} {{values.lastName}}{{/foo-bar}}`,
        {
          model: { lastName: 'Hietala' },
        }
      );

      this.assertText('Chad Hietala');

      runTask(() => this.rerender());

      this.assertText('Chad Hietala');

      runTask(() => {
        set(fooBarInstance, 'model.firstName', 'Godfrey');
        set(this.context, 'model.lastName', 'Chan');
      });

      this.assertText('Godfrey Chan');

      runTask(() => {
        set(fooBarInstance, 'model', { firstName: 'Chad' });
        set(this.context, 'model', { lastName: 'Hietala' });
      });

      this.assertText('Chad Hietala');
    }

    ['@test works with computeds']() {
      let FooBarComponent = class extends Component {
        @computed('hash.firstName', 'hash.lastName')
        get fullName() {
          return `${this.hash.firstName} ${this.hash.lastName}`;
        }
      };

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate(`{{this.fullName}}`), FooBarComponent)
      );

      this.render(`{{foo-bar hash=(hash firstName=this.firstName lastName=this.lastName)}}`, {
        firstName: 'Chad',
        lastName: 'Hietala',
      });

      this.assertText('Chad Hietala');

      runTask(() => this.rerender());

      this.assertText('Chad Hietala');

      runTask(() => {
        set(this.context, 'firstName', 'Godfrey');
        set(this.context, 'lastName', 'Chan');
      });

      this.assertText('Godfrey Chan');
    }


    // ---------------------------------------------------------------------
    // (hash) reference-identity coverage — RFC dual-backend "(hash) / (array)
    // helper identity across renders" row.
    //
    // CLASSIC CONTRACT: the `{{hash}}` helper returns a *memoized* compute
    // reference (createComputeRef in @glimmer/runtime/lib/helpers/hash.ts). The
    // object identity is STABLE across a re-render whose inputs did not change,
    // so a child that `===`-compares the arg (or whose manager tag-compares it)
    // does NOT spuriously fire `didUpdateAttrs`.
    //
    // GXT CONVERGENT BEHAVIOR (pinned below, @lifeart/gxt 0.0.69 — `cachedHelper`
    // memoization, glimmer-next PR #233/#234): GXT now MEMOIZES the (hash)
    // identity:
    //   1. Consecutive reads of the same (hash) arg return the SAME object — the
    //      over-fetching "fresh object per read" divergence is gone.
    //   2. A (hash)'s members are live getters and the identity is value-stable,
    //      so the curly component's `didUpdateAttrs` does NOT fire on an unrelated
    //      re-render or a forced no-op `rerender()` — the over-invalidation the
    //      RFC flagged is fixed. The child still reflects a real member change
    //      because the member is tracked fine-grained (the consuming text/each
    //      re-pulls the live value), NOT via an arg-identity swap.
    //
    // Guarded to GXT (the classic backend already satisfies the stable-identity
    // contract by construction).
    // ---------------------------------------------------------------------
    ['@test [GXT] (hash) is value-correct and returns a STABLE memoized object identity across reads (convergent with the classic memoized ref)'](
      assert
    ) {
      if (!__GXT_MODE__) {
        assert.expect(0);
        return;
      }

      let childInstance;
      let FooBarComponent = class extends Component {
        init() {
          super.init(...arguments);
          childInstance = this;
        }
      };

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('[{{this.obj.key}}]'), FooBarComponent)
      );

      this.render(`{{foo-bar obj=(hash key=this.value)}}`, { value: 'a' });
      this.assertText('[a]');

      // CONVERGENT: the (hash) arg is memoized — consecutive reads return the
      // SAME object (no per-read re-reification).
      assert.strictEqual(
        childInstance.obj,
        childInstance.obj,
        'GXT returns a STABLE memoized (hash) object across reads of the same arg'
      );
      assert.strictEqual(childInstance.obj.key, 'a', 'value is correct on initial render');

      runTask(() => set(this.context, 'value', 'b'));
      this.assertText('[b]');
      assert.strictEqual(childInstance.obj.key, 'b', 'value is correct after the input changes');
    }

    ['@test [GXT] (hash) arg does NOT over-invalidate — didUpdateAttrs stays flat on unrelated/no-op re-renders, and the child still reflects a real member change'](
      assert
    ) {
      if (!__GXT_MODE__) {
        assert.expect(0);
        return;
      }

      let childInstance;
      let updateAttrsCount = 0;
      let FooBarComponent = class extends Component {
        init() {
          super.init(...arguments);
          childInstance = this;
        }
        didUpdateAttrs() {
          updateAttrsCount++;
        }
      };

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('[{{this.obj.key}}]'), FooBarComponent)
      );

      this.render(`{{this.tick}}|{{foo-bar obj=(hash key=this.value)}}`, {
        tick: 0,
        value: 'a',
      });
      this.assertText('0|[a]');

      let afterInitial = updateAttrsCount;

      // (1) UNRELATED re-render: bump this.tick; the (hash) inputs are unchanged.
      //     The memoized (hash) identity is stable, so didUpdateAttrs stays flat
      //     (matches the classic memoized ref — the over-invalidation is fixed).
      runTask(() => set(this.context, 'tick', 1));
      this.assertText('1|[a]');
      assert.strictEqual(
        updateAttrsCount,
        afterInitial,
        `no over-invalidation: didUpdateAttrs stays flat on an unrelated re-render ` +
          `(count stayed ${afterInitial})`
      );

      // (2) Forced no-op rerender: no data changed at all — didUpdateAttrs stays
      //     flat (matches classic).
      runTask(() => this.rerender());
      this.assertText('1|[a]');
      assert.strictEqual(
        updateAttrsCount,
        afterInitial,
        `no over-invalidation: didUpdateAttrs stays flat on a forced no-op rerender ` +
          `(count stayed ${afterInitial})`
      );

      // (3) A REAL member change is still reflected in the child. The (hash)
      //     identity stays stable (its members are live getters), so the child
      //     re-pulls the changed member via fine-grained tracking rather than an
      //     arg-identity swap.
      runTask(() => set(this.context, 'value', 'b'));
      this.assertText('1|[b]');
      assert.strictEqual(childInstance.obj.key, 'b', 'the child observes the changed (hash) value');
    }

    ['@test [GXT][control] a plain primitive arg does NOT over-fire didUpdateAttrs on an unrelated re-render (isolates the over-invalidation to the (hash) reference)'](
      assert
    ) {
      if (!__GXT_MODE__) {
        assert.expect(0);
        return;
      }

      let updateAttrsCount = 0;
      let FooBarComponent = class extends Component {
        didUpdateAttrs() {
          updateAttrsCount++;
        }
      };

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(precompileTemplate('[{{this.value}}]'), FooBarComponent)
      );

      this.render(`{{this.tick}}|{{foo-bar value=this.value}}`, { tick: 0, value: 'a' });
      this.assertText('0|[a]');

      let afterInitial = updateAttrsCount;

      // Same unrelated-re-render trigger as the (hash) test, but the arg is a
      // primitive whose value did not change. didUpdateAttrs must stay flat.
      runTask(() => set(this.context, 'tick', 1));
      this.assertText('1|[a]');
      assert.strictEqual(
        updateAttrsCount,
        afterInitial,
        `a primitive arg does NOT over-fire didUpdateAttrs on an unrelated re-render ` +
          `(stayed at ${afterInitial}) — so the (hash) over-invalidation is tied to the unstable reference identity, not generic re-rendering`
      );
    }
  }
);
