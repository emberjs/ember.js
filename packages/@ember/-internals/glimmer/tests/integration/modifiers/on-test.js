import { moduleFor, RenderingTestCase, runTask } from 'internal-test-helpers';
import { isChrome, isFirefox } from '@ember/-internals/browser-environment';
import { privatize as P } from '@ember/-internals/container';
import { HAS_NATIVE_PROXY } from '@ember/-internals/utils';

import { Component } from '../../utils/helpers';

const isIE11 = !window.ActiveXObject && 'ActiveXObject' in window;

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
      let templateCompiler = this.owner.lookup(P`template-compiler:main`);

      return templateCompiler.resolver.resolver.builtInModifiers.on.manager;
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

    '@test SUPPORTS_EVENT_OPTIONS is correct (private API usage)'(assert) {
      let manager = this.getOnManagerInstance();

      let { SUPPORTS_EVENT_OPTIONS } = manager;

      if (isChrome || isFirefox) {
        assert.strictEqual(SUPPORTS_EVENT_OPTIONS, true, 'is true in chrome and firefox');
      } else if (isIE11) {
        assert.strictEqual(SUPPORTS_EVENT_OPTIONS, false, 'is false in IE11');
      } else {
        assert.expect(0);
      }
    }

    ['@test it adds an event listener'](assert) {
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

      if (isIE11) {
        this.assertCounts({ adds: 1, removes: 1 });
      } else {
        this.assertCounts({ adds: 1, removes: 0 });
      }
    }

    '@test changing from `once=false` to `once=true` ensures the callback can only be called once'(
      assert
    ) {
      let count = 0;

      this.render('<button {{on "click" this.callback once=once}}>Click Me</button>', {
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

      if (isIE11) {
        this.assertCounts({ adds: 2, removes: 2 });
      } else {
        this.assertCounts({ adds: 2, removes: 1 });
      }
    }

    '@test setting passive named argument prevents calling preventDefault'() {
      let matcher = /You marked this listener as 'passive', meaning that you must not call 'event.preventDefault\(\)'/;
      this.render('<button {{on "click" this.callback passive=true}}>Click Me</button>', {
        callback(event) {
          expectAssertion(() => {
            event.preventDefault();
          }, matcher);
        },
      });

      runTask(() => this.$('button').click());
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

    '@test unrelated updates to `this` context does not result in removing + re-adding'(assert) {
      let called = false;

      this.render('<button {{on "click" this.callback}}>Click Me</button>', {
        callback() {
          called = true;
        },
        otherThing: 0,
      });

      this.assertCounts({ adds: 1, removes: 0 });

      runTask(() => this.$('button').click());
      assert.equal(called, 1, 'callback is being invoked');

      runTask(() => this.context.set('otherThing', 1));
      this.assertCounts({ adds: 1, removes: 0 });
    }

    '@test asserts when eventName is missing'() {
      expectAssertion(() => {
        this.render(`<button {{on undefined this.callback}}>Click Me</button>`, {
          callback() {},
        });
      }, /You must pass a valid DOM event name as the first argument to the `on` modifier/);
    }

    '@test asserts when eventName is a bound undefined value'() {
      expectAssertion(() => {
        this.render(`<button {{on this.someUndefinedThing this.callback}}>Click Me</button>`, {
          callback() {},
        });
      }, /You must pass a valid DOM event name as the first argument to the `on` modifier/);
    }

    '@test asserts when eventName is a function'() {
      expectAssertion(() => {
        this.render(`<button {{on this.callback}}>Click Me</button>`, {
          callback() {},
        });
      }, /You must pass a valid DOM event name as the first argument to the `on` modifier/);
    }

    '@test asserts when callback is missing'() {
      expectAssertion(() => {
        this.render(`<button {{on 'click'}}>Click Me</button>`);
      }, /You must pass a function as the second argument to the `on` modifier/);
    }

    '@test asserts when callback is undefined'() {
      expectAssertion(() => {
        this.render(`<button {{on 'click' this.foo}}>Click Me</button>`);
      }, /You must pass a function as the second argument to the `on` modifier/);
    }

    '@test asserts when callback is null'() {
      expectAssertion(() => {
        this.render(`<button {{on 'click' this.foo}}>Click Me</button>`, { foo: null });
      }, /You must pass a function as the second argument to the `on` modifier/);
    }

    '@test asserts if the provided callback accesses `this` without being bound prior to passing to on'(
      assert
    ) {
      this.render(`<button {{on 'click' this.myFunc}}>Click Me</button>`, {
        myFunc() {
          if (HAS_NATIVE_PROXY) {
            expectAssertion(() => {
              this.arg1;
            }, /You accessed `this.arg1` from a function passed to the `on` modifier, but the function itself was not bound to a valid `this` context. Consider updating to usage of `@action`./);
          } else {
            // IE11
            assert.strictEqual(this, null, 'this is null on browsers without native proxy support');
          }
        },

        arg1: 'foo',
      });

      runTask(() => this.$('button').click());
    }

    '@test asserts if more than 2 positional parameters are provided'() {
      expectAssertion(() => {
        this.render(`<button {{on 'click' this.callback this.someArg}}>Click Me</button>`, {
          callback() {},
          someArg: 'foo',
        });
      }, /You can only pass two positional arguments \(event name and callback\) to the `on` modifier, but you provided 3. Consider using the `fn` helper to provide additional arguments to the `on` callback./);
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
      let templateCompiler = this.owner.lookup(P`template-compiler:main`);

      return templateCompiler.resolver.resolver.builtInModifiers.on.manager;
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
      this.registerComponent('foo-bar2', {
        ComponentClass: Component.extend({
          tagName: '',
          fire() {
            assert.ok(false);
          },
        }),
        template: `<button {{on 'click' this.fire}}>Fire!</button>`,
      });

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
