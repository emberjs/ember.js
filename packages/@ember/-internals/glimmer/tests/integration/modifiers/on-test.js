import { moduleFor, RenderingTestCase, runTask } from 'internal-test-helpers';
import { getInternalModifierManager, setComponentTemplate } from '@glimmer/manager';
import { on } from '@glimmer/runtime';
import { precompileTemplate } from '@ember/template-compilation';

import { DEBUG } from '@glimmer/env';

import Component from '@glimmer/component';
import ClassicComponent from '@ember/component';

moduleFor(
  '{{on}} Modifier',
  class extends RenderingTestCase {
    beforeEach() {
      // might error if getOnManagerInstance fails
      this.startingCounters = this.getOnManagerInstance().counters;
    }

    getOnManagerInstance() {
      // leveraging private APIs, this can be deleted if these APIs change
      // but it has been useful to verify some internal details
      return getInternalModifierManager(on);
    }

    assertCounts(expected) {
      let { counters } = this.getOnManagerInstance();

      this.assert.deepEqual(
        counters,
        {
          adds: expected.adds + this.startingCounters.adds,
          removes: expected.removes + this.startingCounters.removes,
        },
        `counters have incremented by ${JSON.stringify(expected)}`
      );
    }

    [`@test it adds an event listener`](assert) {
      let count = 0;

      this.render('<button {{on "click" this.callback}}>Click Me</button>', {
        callback() {
          count++;
        },
      });

      assert.equal(count, 0, 'not called on initial render');

      this.assertStableRerender();
      this.assertCounts({ adds: 1, removes: 0 });
      assert.equal(count, 0, 'not called on a rerender');

      runTask(() => this.$('button').click());
      assert.equal(count, 1, 'has been called 1 time');

      runTask(() => this.$('button').click());
      assert.equal(count, 2, 'has been called 2 times');

      this.assertCounts({ adds: 1, removes: 0 });
    }

    '@test passes the event to the listener'(assert) {
      let event;
      this.render('<button {{on "click" this.callback}}>Click Me</button>', {
        callback(evt) {
          event = evt;
        },
      });

      runTask(() => this.$('button').click());
      assert.strictEqual(
        event.target,
        this.element.querySelector('button'),
        'has a valid event with a target'
      );

      this.assertCounts({ adds: 1, removes: 0 });
    }

    '@test the listener callback is bound'(assert) {
      let first = 0;
      let second = 0;
      let firstCallback = () => first++;
      let secondCallback = () => second++;

      this.render('<button {{on "click" this.callback}}>Click Me</button>', {
        callback: firstCallback,
      });

      assert.equal(first, 0, 'precond - first not called on initial render');
      assert.equal(second, 0, 'precond - second not called on initial render');

      runTask(() => this.$('button').click());
      assert.equal(first, 1, 'first has been called 1 time');
      assert.equal(second, 0, 'second not called on initial render');

      runTask(() => this.context.set('callback', secondCallback));
      runTask(() => this.$('button').click());

      assert.equal(first, 1, 'first has been called 1 time');
      assert.equal(second, 1, 'second has been called 1 times');

      this.assertCounts({ adds: 2, removes: 1 });
    }

    '@test setting once named argument ensures the callback is only called once'(assert) {
      let count = 0;

      this.render('<button {{on "click" this.callback once=true}}>Click Me</button>', {
        callback() {
          count++;
        },
      });

      assert.equal(count, 0, 'not called on initial render');

      this.assertStableRerender();
      assert.equal(count, 0, 'not called on a rerender');

      runTask(() => this.$('button').click());
      assert.equal(count, 1, 'has been called 1 time');

      runTask(() => this.$('button').click());
      assert.equal(count, 1, 'has been called 1 times');

      this.assertCounts({ adds: 1, removes: 0 });
    }

    '@test changing from `once=false` to `once=true` ensures the callback can only be called once'(
      assert
    ) {
      let count = 0;

      this.render('<button {{on "click" this.callback once=this.once}}>Click Me</button>', {
        callback() {
          count++;
        },

        once: false,
      });

      runTask(() => this.$('button').click());
      assert.equal(count, 1, 'has been called 1 time');

      runTask(() => this.$('button').click());
      assert.equal(count, 2, 'has been called 2 times');

      runTask(() => this.context.set('once', true));
      runTask(() => this.$('button').click());
      assert.equal(count, 3, 'has been called 3 time');

      runTask(() => this.$('button').click());
      assert.equal(count, 3, 'is not called again');

      this.assertCounts({ adds: 2, removes: 1 });
    }

    '@test by default bubbling is used (capture: false)'(assert) {
      this.render(
        `
            <div class="outer" {{on 'click' this.handleOuterClick}}>
              <div class="inner" {{on 'click' this.handleInnerClick}}></div>
            </div>
          `,
        {
          handleOuterClick() {
            assert.step('outer clicked');
          },
          handleInnerClick() {
            assert.step('inner clicked');
          },
        }
      );

      runTask(() => this.$('.inner').click());

      assert.verifySteps(['inner clicked', 'outer clicked'], 'uses capture: false by default');
    }

    '@test specifying capture named argument uses capture semantics'(assert) {
      this.render(
        `
            <div class="outer" {{on 'click' this.handleOuterClick capture=true}}>
              <div class="inner" {{on 'click' this.handleInnerClick}}></div>
            </div>
          `,
        {
          handleOuterClick() {
            assert.step('outer clicked');
          },
          handleInnerClick() {
            assert.step('inner clicked');
          },
        }
      );

      runTask(() => this.$('.inner').click());

      assert.verifySteps(['outer clicked', 'inner clicked'], 'capture works');
    }

    '@test can use capture and once together'(assert) {
      this.render(
        `
            <div class="outer" {{on 'click' this.handleOuterClick once=true capture=true}}>
              <div class="inner" {{on 'click' this.handleInnerClick}}></div>
            </div>
          `,
        {
          handleOuterClick() {
            assert.step('outer clicked');
          },
          handleInnerClick() {
            assert.step('inner clicked');
          },
        }
      );

      runTask(() => this.$('.inner').click());

      assert.verifySteps(['outer clicked', 'inner clicked'], 'capture works');

      runTask(() => this.$('.inner').click());
      assert.verifySteps(['inner clicked'], 'once works');
    }

    '@test it removes the modifier when the element is removed'(assert) {
      let count = 0;

      this.render(
        '{{#if this.showButton}}<button {{on "click" this.callback}}>Click Me</button>{{/if}}',
        {
          callback() {
            count++;
          },
          showButton: true,
        }
      );

      this.assertCounts({ adds: 1, removes: 0 });

      runTask(() => this.$('button').click());
      assert.equal(count, 1, 'has been called 1 time');

      runTask(() => this.context.set('showButton', false));

      this.assertCounts({ adds: 1, removes: 1 });
    }

    [`@test it throws a helpful error when callback is undefined`](assert) {
      if (DEBUG) {
        let expectedMessage =
          /You must pass a function as the second argument to the `on` modifier/;
        assert.throws(() => {
          this.render('<button {{on "click" undefined}}>Click Me</button>');
        }, expectedMessage);
      } else {
        assert.expect(0);
      }
    }

    [`@test it throws a helpful error when callback is null`](assert) {
      if (DEBUG) {
        let expectedMessage =
          /You must pass a function as the second argument to the `on` modifier/;
        assert.throws(() => {
          this.render('<button {{on "click" null}}>Click Me</button>');
        }, expectedMessage);
      } else {
        assert.expect(0);
      }
    }

    '@test it does not clobber a static spellcheck attribute, before or after the modifier (GH#18758)'(
      assert
    ) {
      this.render(
        '<input spellcheck="false" {{on "click" this.callback}} /><input {{on "click" this.callback}} spellcheck="false" />',
        {
          callback() {},
        }
      );

      let [attrFirst, attrLast] = this.element.querySelectorAll('input');

      assert.strictEqual(
        attrFirst.getAttribute('spellcheck'),
        'false',
        'attribute before modifier renders as authored'
      );
      assert.strictEqual(
        attrLast.getAttribute('spellcheck'),
        'false',
        'attribute after modifier renders as authored'
      );

      this.assertStableRerender();
      this.assertCounts({ adds: 2, removes: 0 });
    }

    "@test listeners from the invocation run before the element's own listeners, wherever ...attributes is (GH#17877)"(
      assert
    ) {
      let calls = [];

      this.owner.register(
        'component:before-splat',
        setComponentTemplate(
          precompileTemplate(`<button {{on 'click' this.inner}} ...attributes>Click</button>`),
          class extends Component {
            inner = () => calls.push('inner');
          }
        )
      );

      this.owner.register(
        'component:after-splat',
        setComponentTemplate(
          precompileTemplate(`<button ...attributes {{on 'click' this.inner}}>Click</button>`),
          class extends Component {
            inner = () => calls.push('inner');
          }
        )
      );

      this.render(
        `<BeforeSplat id="before" {{on 'click' this.outer}} /><AfterSplat id="after" {{on 'click' this.outer}} />`,
        { outer: () => calls.push('outer') }
      );

      runTask(() => this.$('#before').click());
      assert.deepEqual(calls, ['outer', 'inner'], 'own modifier before ...attributes');

      calls = [];
      runTask(() => this.$('#after').click());
      assert.deepEqual(calls, ['outer', 'inner'], 'own modifier after ...attributes');
    }

    '@test {{on}} listeners run before classic component event handler methods (GH#17877)'(assert) {
      let calls = [];

      this.owner.register(
        'component:classic-clicker',
        setComponentTemplate(
          precompileTemplate(`<span {{on 'click' this.inner}}>Click</span>`),
          class extends ClassicComponent {
            inner = () => calls.push('inner');

            click() {
              calls.push('click()');
            }
          }
        )
      );

      this.render(`<ClassicClicker {{on 'click' this.outer}} />`, {
        outer: () => calls.push('outer'),
      });

      runTask(() => this.$('span').click());
      assert.deepEqual(calls, ['inner', 'outer', 'click()'], 'click() runs last');

      calls = [];
      runTask(() =>
        this.context.set('outer', (event) => {
          calls.push('outer');
          event.stopPropagation();
        })
      );
      runTask(() => this.$('span').click());
      assert.deepEqual(
        calls,
        ['inner', 'outer'],
        'stopping propagation in an {{on}} listener prevents click()'
      );
    }
  }
);

moduleFor(
  'Rendering test: non-interactive `on` modifier',
  class extends RenderingTestCase {
    getBootOptions() {
      return { isInteractive: false };
    }

    beforeEach() {
      // might error if getOnManagerInstance fails
      this.startingCounters = this.getOnManagerInstance().counters;
    }

    getOnManagerInstance() {
      // leveraging private APIs, this can be deleted if these APIs change
      // but it has been useful to verify some internal details
      return getInternalModifierManager(on);
    }

    assertCounts(expected) {
      let { counters } = this.getOnManagerInstance();

      this.assert.deepEqual(
        counters,
        {
          adds: expected.adds + this.startingCounters.adds,
          removes: expected.removes + this.startingCounters.removes,
        },
        `counters have incremented by ${JSON.stringify(expected)}`
      );
    }

    [`@test doesn't trigger lifecycle hooks when non-interactive`](assert) {
      this.owner.register(
        'component:foo-bar2',
        setComponentTemplate(
          precompileTemplate(`<button {{on 'click' this.fire}}>Fire!</button>`),
          class extends Component {
            fire() {
              assert.ok(false);
            }
          }
        )
      );

      this.render('{{#if this.showButton}}<FooBar2 />{{/if}}', {
        showButton: true,
      });
      this.assertHTML('<button>Fire!</button>');
      this.assertCounts({ adds: 0, removes: 0 });

      this.$('button').click();

      runTask(() => this.context.set('showButton', false));

      this.assertCounts({ adds: 0, removes: 0 });
    }
  }
);
