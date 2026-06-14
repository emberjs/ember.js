import { RenderingTestCase, moduleFor, runTask, strip } from 'internal-test-helpers';
import { setComponentTemplate } from '@glimmer/manager';
import { precompileTemplate } from '@ember/template-compilation';
import templateOnly from '@ember/component/template-only';

import { set } from '@ember/object';

import { Component } from '../../utils/helpers';

moduleFor(
  'Helpers test: {{array}}',
  class extends RenderingTestCase {
    ['@test returns an array']() {
      this.render(strip`
      {{#let (array "Sergio") as |people|}}
        {{#each people as |personName|}}
          {{personName}}
        {{/each}}
      {{/let}}`);

      this.assertText('Sergio');

      this.assertStableRerender();
    }

    ['@test the array helper can be shadowed']() {
      function array(...list) {
        return list.map((n) => n * 2);
      }

      let First = setComponentTemplate(
        precompileTemplate(`{{#each (array 1 2 3) as |n|}}[{{n}}]{{/each}}`, {
          strictMode: true,
          scope: () => ({ array }),
        }),
        templateOnly()
      );

      let Root = setComponentTemplate(
        precompileTemplate(
          `{{#let shadowArray as |array|}}{{#each (array 5 10 15) as |n|}}[{{n}}]{{/each}}{{/let}}<First />`,
          { strictMode: true, scope: () => ({ shadowArray: array, First }) }
        ),
        templateOnly()
      );

      this.renderComponent(Root, { expect: '[10][20][30][2][4][6]' });
    }

    ['@test can have more than one value']() {
      this.render(strip`
      {{#let (array "Sergio" "Robert") as |people|}}
        {{#each people as |personName|}}
          {{personName}},
        {{/each}}
      {{/let}}`);

      this.assertText('Sergio,Robert,');

      this.assertStableRerender();
    }

    ['@test binds values when variables are used']() {
      this.render(
        strip`{{#let (array this.personOne) as |people|}}
              {{#each people as |personName|}}
                {{personName}}
              {{/each}}
            {{/let}}`,
        {
          personOne: 'Tom',
        }
      );

      this.assertText('Tom');

      this.assertStableRerender();

      runTask(() => set(this.context, 'personOne', 'Yehuda'));
      this.assertText('Yehuda');

      runTask(() => set(this.context, 'personOne', 'Tom'));
      this.assertText('Tom');
    }

    ['@test binds multiple values when variables are used']() {
      this.render(
        strip`{{#let (array this.personOne this.personTwo) as |people|}}
              {{#each people as |personName|}}
                {{personName}},
              {{/each}}
            {{/let}}`,
        {
          personOne: 'Tom',
          personTwo: 'Yehuda',
        }
      );

      this.assertText('Tom,Yehuda,');

      this.assertStableRerender();

      runTask(() => set(this.context, 'personOne', 'Sergio'));

      this.assertText('Sergio,Yehuda,');

      runTask(() => set(this.context, 'personTwo', 'Tom'));

      this.assertText('Sergio,Tom,');

      runTask(() => {
        set(this.context, 'personOne', 'Tom');
        set(this.context, 'personTwo', 'Yehuda');
      });

      this.assertText('Tom,Yehuda,');
    }

    ['@test array helpers can be nested']() {
      this.render(
        strip`{{#let (array (array this.personOne this.personTwo)) as |listOfPeople|}}
              {{#each listOfPeople as |people|}}
                List:
                {{#each people as |personName|}}
                  {{personName}},
                {{/each}}
              {{/each}}
            {{/let}}`,
        {
          personOne: 'Tom',
          personTwo: 'Yehuda',
        }
      );

      this.assertText('List:Tom,Yehuda,');

      this.assertStableRerender();

      runTask(() => set(this.context, 'personOne', 'Chad'));

      this.assertText('List:Chad,Yehuda,');

      runTask(() => set(this.context, 'personTwo', 'Balint'));

      this.assertText('List:Chad,Balint,');

      runTask(() => {
        set(this.context, 'personOne', 'Tom');
        set(this.context, 'personTwo', 'Yehuda');
      });

      this.assertText('List:Tom,Yehuda,');
    }

    ['@test should yield hash of an array of internal properties']() {
      let fooBarInstance;
      let FooBarComponent = class extends Component {
        init() {
          super.init();
          fooBarInstance = this;
          this.model = { personOne: 'Chad' };
        }
      };

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(
          precompileTemplate(`{{yield (hash people=(array this.model.personOne))}}`),
          FooBarComponent
        )
      );

      this.render(strip`
      {{#foo-bar as |values|}}
        {{#each values.people as |personName|}}
          {{personName}}
        {{/each}}
      {{/foo-bar}}`);

      this.assertText('Chad');

      this.assertStableRerender();

      runTask(() => set(fooBarInstance, 'model.personOne', 'Godfrey'));

      this.assertText('Godfrey');

      runTask(() => set(fooBarInstance, 'model', { personOne: 'Chad' }));

      this.assertText('Chad');

      runTask(() => set(fooBarInstance, 'model.personOne', 'Godfrey'));

      this.assertText('Godfrey');
    }

    ['@test should yield hash of an array of internal and external properties']() {
      let fooBarInstance;
      let FooBarComponent = class extends Component {
        init() {
          super.init();
          fooBarInstance = this;
          this.model = { personOne: 'Chad' };
        }
      };

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(
          precompileTemplate(`{{yield (hash people=(array this.model.personOne this.personTwo))}}`),
          FooBarComponent
        )
      );

      this.render(
        strip`
        {{#foo-bar personTwo=this.model.personTwo as |values|}}
          {{#each values.people as |personName|}}
            {{personName}},
          {{/each}}
        {{/foo-bar}}`,
        {
          model: { personTwo: 'Tom' },
        }
      );

      this.assertText('Chad,Tom,');

      this.assertStableRerender();

      runTask(() => {
        set(fooBarInstance, 'model.personOne', 'Godfrey');
        set(this.context, 'model.personTwo', 'Yehuda');
      });

      this.assertText('Godfrey,Yehuda,');

      runTask(() => {
        set(fooBarInstance, 'model', { personOne: 'Chad' });
        set(this.context, 'model', { personTwo: 'Tom' });
      });

      this.assertText('Chad,Tom,');
    }

    ['@test should render when passing as argument to a component invocation']() {
      let FooBarComponent = class extends Component {};

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(
          precompileTemplate('{{#each this.people as |personName|}}{{personName}},{{/each}}'),
          FooBarComponent
        )
      );

      this.render(strip`{{foo-bar people=(array "Tom" this.personTwo)}}`, { personTwo: 'Chad' });

      this.assertText('Tom,Chad,');

      this.assertStableRerender();

      runTask(() => set(this.context, 'personTwo', 'Godfrey'));

      this.assertText('Tom,Godfrey,');

      runTask(() => set(this.context, 'personTwo', 'Chad'));

      this.assertText('Tom,Chad,');
    }

    ['@test should return an entirely new array when any argument change']() {
      let fooBarInstance;
      let FooBarComponent = class extends Component {
        init() {
          super.init();
          fooBarInstance = this;
        }
      };

      this.owner.register(
        'component:foo-bar',
        setComponentTemplate(
          precompileTemplate('{{#each this.people as |personName|}}{{personName}},{{/each}}'),
          FooBarComponent
        )
      );

      this.render(strip`{{foo-bar people=(array "Tom" this.personTwo)}}`, { personTwo: 'Chad' });

      let firstArray = fooBarInstance.people;

      runTask(() => set(this.context, 'personTwo', 'Godfrey'));

      this.assert.ok(
        firstArray !== fooBarInstance.people,
        'should have created an entirely new array'
      );
    }

    ['@test capture array values in JS to assert deep equal']() {
      let captured;

      this.registerHelper('capture', function ([array]) {
        captured = array;
        return 'captured';
      });

      this.render(`{{capture (array 'Tom' this.personTwo)}}`, { personTwo: 'Godfrey' });

      this.assert.deepEqual(captured, ['Tom', 'Godfrey']);

      runTask(() => set(this.context, 'personTwo', 'Robert'));

      this.assert.deepEqual(captured, ['Tom', 'Robert']);

      runTask(() => set(this.context, 'personTwo', 'Godfrey'));

      this.assert.deepEqual(captured, ['Tom', 'Godfrey']);
    }

    ['@test GH18693 properties in hash can be accessed from the array']() {
      this.render(strip`
        {{#each (array (hash some="thing")) as |item|}}
          {{item.some}}
        {{/each}}`);

      this.assertText('thing');
    }

    // ---------------------------------------------------------------------
    // (array) reference-identity coverage — RFC dual-backend "(hash) / (array)
    // helper identity across renders" row (was marked UNVALIDATED).
    //
    // The "should return an entirely new array when any argument change" test
    // above already pins the FRESH-on-change half. These tests cover the
    // uncovered inverse — identity across a re-render whose inputs did NOT
    // change — and the downstream over-invalidation the RFC flagged.
    //
    // CLASSIC CONTRACT: `{{array}}` is a memoized compute reference
    // (createComputeRef in @glimmer/runtime/lib/helpers/array.ts): stable
    // identity across an unchanged re-render, fresh only on a real input change.
    //
    // GXT ACTUAL BEHAVIOR (pinned below, @lifeart/gxt 0.0.67): GXT re-reifies
    // the array on every read (fresh identity per read), so the curly
    // component's `didUpdateAttrs` fires on an UNRELATED re-render and on a
    // forced no-op `rerender()` — OVER-INVALIDATION. The primitive-arg control
    // in hash-test.js shows this is tied to the (array) reference identity, not
    // generic re-rendering. The RFC row must stay UNVALIDATED / be called out
    // as a known preview divergence until @lifeart/gxt memoizes the reference;
    // when that lands these assertions flip to the classic contract.
    //
    // Guarded to GXT (classic satisfies the stable-identity contract already).
    // ---------------------------------------------------------------------
    ['@test [GXT] (array) is value-correct across re-renders but returns a fresh array identity per read (divergence from the classic memoized ref)'](
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

      // DIVERGENCE: classic returns the SAME memoized array on consecutive
      // reads; GXT re-reifies a fresh array every read.
      assert.notStrictEqual(
        childInstance.people,
        childInstance.people,
        'GXT returns a FRESH (array) on each read of the same arg in one render (no memoization)'
      );
      assert.deepEqual(
        childInstance.people,
        ['Tom', 'Chad'],
        'value is correct on initial render'
      );

      runTask(() => set(this.context, 'personTwo', 'Godfrey'));
      this.assertText('[Tom][Godfrey]');
      assert.deepEqual(
        childInstance.people,
        ['Tom', 'Godfrey'],
        'value is correct after the input changes'
      );
    }

    ['@test [GXT] (array) arg OVER-INVALIDATES — didUpdateAttrs fires on an unrelated re-render and a forced no-op rerender'](
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
      //     unchanged. Classic keeps identity (no fire); GXT's fresh-identity
      //     array makes the arg look always-changed, so it fires.
      runTask(() => set(this.context, 'tick', 1));
      this.assertText('1|[Tom][Chad]');
      assert.ok(
        updateAttrsCount > afterInitial,
        `OVER-INVALIDATION: didUpdateAttrs fired on an unrelated re-render ` +
          `(count ${afterInitial} -> ${updateAttrsCount}); the classic memoized (array) ref would keep this flat`
      );

      let afterTick = updateAttrsCount;

      // (2) Forced no-op rerender: nothing changed. Classic fires nothing.
      runTask(() => this.rerender());
      this.assertText('1|[Tom][Chad]');
      assert.ok(
        updateAttrsCount > afterTick,
        `OVER-INVALIDATION: didUpdateAttrs fired on a forced no-op rerender ` +
          `(count ${afterTick} -> ${updateAttrsCount})`
      );

      let afterNoop = updateAttrsCount;

      // (3) A REAL input change must still propagate (correctness floor).
      runTask(() => set(this.context, 'personTwo', 'Godfrey'));
      this.assertText('1|[Tom][Godfrey]');
      assert.ok(
        updateAttrsCount > afterNoop,
        'a real (array) input change still propagates didUpdateAttrs to the child'
      );
      assert.deepEqual(
        childInstance.people,
        ['Tom', 'Godfrey'],
        'the child observes the changed (array) value'
      );
    }
  }
);
