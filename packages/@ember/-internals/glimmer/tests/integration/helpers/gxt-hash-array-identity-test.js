import { RenderingTestCase, moduleFor, runTask } from 'internal-test-helpers';
import { setComponentTemplate } from '@glimmer/manager';
import { precompileTemplate } from '@ember/template-compilation';

import { set } from '@ember/object';

import { Component } from '../../utils/helpers';

// GXT-only (hash) / (array) reference-identity coverage. These tests were
// appended to helpers/array-test.js and helpers/hash-test.js; upstream rewrote
// those files as `.gjs` tests on `@ember/test-helpers`, so they live here, in
// their original RenderingTestCase / classic-component form.

moduleFor(
  'Helpers test: {{array}} reference identity',
  class extends RenderingTestCase {
    // ---------------------------------------------------------------------
    // (array) reference-identity coverage — RFC dual-backend "(hash) / (array)
    // helper identity across renders" row.
    //
    // CLASSIC CONTRACT: `{{array}}` is a memoized compute reference
    // (createComputeRef in @glimmer/runtime/lib/helpers/array.ts): stable
    // identity across an unchanged re-render, fresh only on a real input change.
    //
    // GXT BEHAVIOR (pinned below; gxt's `cachedHelper` memoization): GXT
    // memoizes the (array) identity to match the classic contract — stable across reads and unrelated
    // re-renders, and a FRESH identity only when an element actually changes.
    // Unlike (hash) (whose members are live getters, so its identity is
    // value-stable), (array) eagerly snapshots its elements, so a real element
    // change turns over the identity and DOES fire `didUpdateAttrs` — exactly
    // the classic contract.
    //
    // Guarded to GXT (classic satisfies the stable-identity contract already).
    // ---------------------------------------------------------------------
    ['@test [GXT] (array) is value-correct and returns a STABLE memoized array identity across reads, fresh only on a real change (convergent with the classic memoized ref)'](
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
        setComponentTemplate(
          precompileTemplate('{{#each this.people as |p|}}[{{p}}]{{/each}}'),
          FooBarComponent
        )
      );

      this.render(`{{foo-bar people=(array "Tom" this.personTwo)}}`, { personTwo: 'Chad' });
      this.assertText('[Tom][Chad]');

      // CONVERGENT: the (array) arg is memoized — consecutive reads return the
      // SAME array (no per-read re-reification).
      assert.strictEqual(
        childInstance.people,
        childInstance.people,
        'GXT returns a STABLE memoized (array) across reads of the same arg'
      );
      let firstArray = childInstance.people;
      assert.deepEqual(childInstance.people, ['Tom', 'Chad'], 'value is correct on initial render');

      runTask(() => set(this.context, 'personTwo', 'Godfrey'));
      this.assertText('[Tom][Godfrey]');
      assert.deepEqual(
        childInstance.people,
        ['Tom', 'Godfrey'],
        'value is correct after the input changes'
      );
      // A real element change produces a FRESH identity (classic contract).
      assert.notStrictEqual(
        childInstance.people,
        firstArray,
        'a real (array) element change turns over the array identity'
      );
    }

    ['@test [GXT] (array) arg does NOT over-invalidate — didUpdateAttrs stays flat on unrelated/no-op re-renders and fires only on a real change'](
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
        setComponentTemplate(
          precompileTemplate('{{#each this.people as |p|}}[{{p}}]{{/each}}'),
          FooBarComponent
        )
      );

      this.render(`{{this.tick}}|{{foo-bar people=(array "Tom" this.personTwo)}}`, {
        tick: 0,
        personTwo: 'Chad',
      });
      this.assertText('0|[Tom][Chad]');

      let afterInitial = updateAttrsCount;

      // (1) UNRELATED re-render: bump this.tick; the (array) inputs are
      //     unchanged. The memoized (array) identity is stable, so didUpdateAttrs
      //     stays flat (matches classic — the over-invalidation is fixed).
      runTask(() => set(this.context, 'tick', 1));
      this.assertText('1|[Tom][Chad]');
      assert.strictEqual(
        updateAttrsCount,
        afterInitial,
        `no over-invalidation: didUpdateAttrs stays flat on an unrelated re-render ` +
          `(count stayed ${afterInitial})`
      );

      // (2) Forced no-op rerender: nothing changed — didUpdateAttrs stays flat.
      runTask(() => this.rerender());
      this.assertText('1|[Tom][Chad]');
      assert.strictEqual(
        updateAttrsCount,
        afterInitial,
        `no over-invalidation: didUpdateAttrs stays flat on a forced no-op rerender ` +
          `(count stayed ${afterInitial})`
      );

      let afterNoop = updateAttrsCount;

      // (3) A REAL element change turns over the (array) identity, so it DOES
      //     propagate didUpdateAttrs to the child (classic contract).
      runTask(() => set(this.context, 'personTwo', 'Godfrey'));
      this.assertText('1|[Tom][Godfrey]');
      assert.ok(
        updateAttrsCount > afterNoop,
        `a real (array) element change propagates didUpdateAttrs to the child ` +
          `(count ${afterNoop} -> ${updateAttrsCount})`
      );
      assert.deepEqual(
        childInstance.people,
        ['Tom', 'Godfrey'],
        'the child observes the changed (array) value'
      );
    }
  }
);

moduleFor(
  'Helpers test: {{hash}} reference identity',
  class extends RenderingTestCase {
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
    // GXT BEHAVIOR (pinned below; gxt's `cachedHelper` memoization): GXT
    // MEMOIZES the (hash) identity:
    //   1. Consecutive reads of the same (hash) arg return the SAME object — the
    //      over-fetching "fresh object per read" divergence is gone.
    //   2. A (hash)'s members are live getters and the identity is value-stable,
    //      so the curly component's `didUpdateAttrs` does NOT fire on an unrelated
    //      re-render or a forced no-op `rerender()`. The child still reflects a
    //      real member change because the member is tracked fine-grained (the
    //      consuming text/each re-pulls the live value), NOT via an arg-identity
    //      swap.
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
