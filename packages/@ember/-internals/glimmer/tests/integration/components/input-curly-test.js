import { RenderingTestCase, moduleFor, runDestroy, runTask } from 'internal-test-helpers';

import { EMBER_MODERNIZED_BUILT_IN_COMPONENTS } from '@ember/canary-features';
import { maybeExpectDeprecation } from 'internal-test-helpers';
import { action } from '@ember/object';
import { assign } from '@ember/polyfills';
import { set } from '@ember/-internals/metal';
import { jQueryDisabled, jQuery } from '@ember/-internals/views';

import { Component } from '../../utils/helpers';

class InputRenderingTest extends RenderingTestCase {
  $input() {
    return this.$('input');
  }

  inputID() {
    return this.$input().prop('id');
  }

  assertDisabled() {
    this.assert.ok(this.$('input').prop('disabled'), 'The input is disabled');
  }

  assertNotDisabled() {
    this.assert.ok(this.$('input').is(':not(:disabled)'), 'The input is not disabled');
  }

  assertInputId(expectedId) {
    this.assert.equal(this.inputID(), expectedId, 'the input id should be `expectedId`');
  }

  assertSingleInput() {
    this.assert.equal(this.$('input').length, 1, 'A single text field was inserted');
  }

  assertSingleCheckbox() {
    this.assert.equal(this.$('input[type=checkbox]').length, 1, 'A single checkbox is added');
  }

  assertCheckboxIsChecked() {
    this.assert.equal(this.$input().prop('checked'), true, 'the checkbox is checked');
  }

  assertCheckboxIsNotChecked() {
    this.assert.equal(this.$input().prop('checked'), false, 'the checkbox is not checked');
  }

  assertValue(expected) {
    this.assert.equal(this.$input().val(), expected, `the input value should be ${expected}`);
  }

  assertAttr(name, expected) {
    this.assert.equal(
      this.$input().attr(name),
      expected,
      `the input ${name} attribute has the value '${expected}'`
    );
  }

  assertAllAttrs(names, expected) {
    names.forEach((name) => this.assertAttr(name, expected));
  }

  assertSelectionRange(start, end) {
    let input = this.$input()[0];
    this.assert.equal(input.selectionStart, start, `the cursor start position should be ${start}`);
    this.assert.equal(input.selectionEnd, end, `the cursor end position should be ${end}`);
  }

  triggerEvent(type, options) {
    let event = document.createEvent('Events');
    event.initEvent(type, true, true);
    assign(event, options);

    let element = this.$input()[0];
    runTask(() => {
      element.dispatchEvent(event);
    });
  }

  assertTriggersNativeDOMEvents(type) {
    // Defaults from EventDispatcher
    let events = {
      touchstart: 'touchStart',
      touchmove: 'touchMove',
      touchend: 'touchEnd',
      touchcancel: 'touchCancel',
      keydown: 'keyDown',
      keyup: 'keyUp',
      keypress: 'keyPress',
      mousedown: 'mouseDown',
      mouseup: 'mouseUp',
      contextmenu: 'contextMenu',
      click: 'click',
      dblclick: 'doubleClick',
      focusin: 'focusIn',
      focusout: 'focusOut',
      submit: 'submit',
      input: 'input',
      change: 'change',
      dragstart: 'dragStart',
      drag: 'drag',
      dragenter: 'dragEnter',
      dragleave: 'dragLeave',
      dragover: 'dragOver',
      drop: 'drop',
      dragend: 'dragEnd',
    };

    let TestComponent = Component.extend({ tagName: 'input' });
    this.registerComponent('test-component', { ComponentClass: TestComponent });

    let triggeredEvents = [];
    let actions = {};
    Object.keys(events).forEach((evt) => {
      actions[`run_${evt}`] = function () {
        triggeredEvents.push(evt);
      };
    });

    let typeAttr = type ? `type="${type}" ` : '';
    let actionAttrs = Object.keys(events)
      .map((evt) => `${events[evt]}=(action 'run_${evt}')`)
      .join(' ');
    let template = `{{test-component ${typeAttr}${actionAttrs}}}{{input ${typeAttr}${actionAttrs}}}`;

    this.render(template, { actions });

    Object.keys(events).forEach((evt) => this.triggerEvent(evt, null, 'input:first-of-type'));
    let normallyTriggeredEvents = [].concat(triggeredEvents);
    triggeredEvents.length = 0;

    this.assert.ok(
      normallyTriggeredEvents.length > 10,
      'sanity check that most events are triggered'
    );

    normallyTriggeredEvents.forEach((evt) => this.triggerEvent(evt, null, 'input:last-of-type'));

    this.assert.deepEqual(triggeredEvents, normallyTriggeredEvents, 'called for all events');
  }
}

moduleFor(
  'Components test: {{input}}',
  class extends InputRenderingTest {
    ['@test a single text field is inserted into the DOM']() {
      this.render(`{{input type="text" value=this.value}}`, { value: 'hello' });

      let id = this.inputID();

      this.assertValue('hello');
      this.assertSingleInput();

      runTask(() => this.rerender());

      this.assertValue('hello');
      this.assertSingleInput();
      this.assertInputId(id);

      runTask(() => set(this.context, 'value', 'goodbye'));

      this.assertValue('goodbye');
      this.assertSingleInput();
      this.assertInputId(id);

      runTask(() => set(this.context, 'value', 'hello'));

      this.assertValue('hello');
      this.assertSingleInput();
      this.assertInputId(id);
    }

    ['@test default type']() {
      this.render(`{{input}}`);

      this.assertAttr('type', 'text');

      runTask(() => this.rerender());

      this.assertAttr('type', 'text');
    }

    ['@test [DEPRECATED] dynamic attributes']() {
      maybeExpectDeprecation(
        EMBER_MODERNIZED_BUILT_IN_COMPONENTS,
        () => {
          this.render(
            `
            {{input type="text"
              elementId="test-input"
              ariaRole=this.role
              disabled=this.disabled
              value=this.value
              placeholder=this.placeholder
              name=this.name
              maxlength=this.maxlength
              minlength=this.minlength
              size=this.size
              tabindex=this.tabindex
            }}`,
            {
              role: 'textbox',
              disabled: false,
              value: 'Original value',
              placeholder: 'Original placeholder',
              name: 'original-name',
              maxlength: 10,
              minlength: 5,
              size: 20,
              tabindex: 30,
            }
          );
        },
        /Passing the `@(elementId|ariaRole|disabled|placeholder|name|maxlength|minlength|size|tabindex)` argument to <Input> is deprecated\./
      );

      this.assertNotDisabled();
      this.assertValue('Original value');
      this.assertAttr('id', 'test-input');
      this.assertAttr('role', 'textbox');
      this.assertAttr('placeholder', 'Original placeholder');
      this.assertAttr('name', 'original-name');
      this.assertAttr('maxlength', '10');
      this.assertAttr('minlength', '5');
      // this.assertAttr('size', '20'); //NOTE: failing in IE  (TEST_SUITE=sauce)
      // this.assertAttr('tabindex', '30'); //NOTE: failing in IE (TEST_SUITE=sauce)

      runTask(() => this.rerender());

      this.assertNotDisabled();
      this.assertValue('Original value');
      this.assertAttr('id', 'test-input');
      this.assertAttr('role', 'textbox');
      this.assertAttr('placeholder', 'Original placeholder');
      this.assertAttr('name', 'original-name');
      this.assertAttr('maxlength', '10');
      this.assertAttr('minlength', '5');
      // this.assertAttr('size', '20'); //NOTE: failing in IE (TEST_SUITE=sauce)
      // this.assertAttr('tabindex', '30'); //NOTE: failing in IE (TEST_SUITE=sauce)

      maybeExpectDeprecation(
        EMBER_MODERNIZED_BUILT_IN_COMPONENTS,
        () => {
          runTask(() => {
            set(this.context, 'role', 'search');
            set(this.context, 'value', 'Updated value');
            set(this.context, 'disabled', true);
            set(this.context, 'placeholder', 'Updated placeholder');
            set(this.context, 'name', 'updated-name');
            set(this.context, 'maxlength', 11);
            set(this.context, 'minlength', 6);
            // set(this.context, 'size', 21); //NOTE: failing in IE (TEST_SUITE=sauce)
            // set(this.context, 'tabindex', 31); //NOTE: failing in IE (TEST_SUITE=sauce)
          });
        },
        /Passing the `@(elementId|ariaRole|disabled|placeholder|name|maxlength|minlength|size|tabindex)` argument to <Input> is deprecated\./
      );

      this.assertDisabled();
      this.assertValue('Updated value');
      this.assertAttr('id', 'test-input');
      this.assertAttr('role', 'search');
      this.assertAttr('placeholder', 'Updated placeholder');
      this.assertAttr('name', 'updated-name');
      this.assertAttr('maxlength', '11');
      this.assertAttr('minlength', '6');
      // this.assertAttr('size', '21'); //NOTE: failing in IE (TEST_SUITE=sauce)
      // this.assertAttr('tabindex', '31'); //NOTE: failing in IE (TEST_SUITE=sauce)

      maybeExpectDeprecation(
        EMBER_MODERNIZED_BUILT_IN_COMPONENTS,
        () => {
          runTask(() => {
            set(this.context, 'role', 'textbox');
            set(this.context, 'value', 'Original value');
            set(this.context, 'disabled', false);
            set(this.context, 'placeholder', 'Original placeholder');
            set(this.context, 'name', 'original-name');
            set(this.context, 'maxlength', 10);
            set(this.context, 'minlength', 5);
            // set(this.context, 'size', 20); //NOTE: failing in IE (TEST_SUITE=sauce)
            // set(this.context, 'tabindex', 30); //NOTE: failing in IE (TEST_SUITE=sauce)
          });
        },
        /Passing the `@(elementId|ariaRole|disabled|placeholder|name|maxlength|minlength|size|tabindex)` argument to <Input> is deprecated\./
      );

      this.assertNotDisabled();
      this.assertValue('Original value');
      this.assertAttr('id', 'test-input');
      this.assertAttr('role', 'textbox');
      this.assertAttr('placeholder', 'Original placeholder');
      this.assertAttr('name', 'original-name');
      this.assertAttr('maxlength', '10');
      this.assertAttr('minlength', '5');
      // this.assertAttr('size', '20'); //NOTE: failing in IE (TEST_SUITE=sauce)
      // this.assertAttr('tabindex', '30'); //NOTE: failing in IE (TEST_SUITE=sauce)
    }

    ['@test [DEPRECATED] static attributes']() {
      maybeExpectDeprecation(
        EMBER_MODERNIZED_BUILT_IN_COMPONENTS,
        () => {
          this.render(`
            {{input type="text"
              elementId="test-input"
              ariaRole="search"
              disabled=true
              value="Original value"
              placeholder="Original placeholder"
              name="original-name"
              maxlength=10
              minlength=5
              size=20
              tabindex=30
            }}`);
        },
        /Passing the `@(elementId|ariaRole|disabled|placeholder|name|maxlength|minlength|size|tabindex)` argument to <Input> is deprecated\./
      );

      this.assertDisabled();
      this.assertValue('Original value');
      this.assertAttr('id', 'test-input');
      this.assertAttr('role', 'search');
      this.assertAttr('placeholder', 'Original placeholder');
      this.assertAttr('name', 'original-name');
      this.assertAttr('maxlength', '10');
      this.assertAttr('minlength', '5');
      // this.assertAttr('size', '20');  //NOTE: failing in IE (TEST_SUITE=sauce)
      // this.assertAttr('tabindex', '30');  //NOTE: failing in IE (TEST_SUITE=sauce)

      runTask(() => this.rerender());

      this.assertDisabled();
      this.assertValue('Original value');
      this.assertAttr('id', 'test-input');
      this.assertAttr('role', 'search');
      this.assertAttr('placeholder', 'Original placeholder');
      this.assertAttr('name', 'original-name');
      this.assertAttr('maxlength', '10');
      this.assertAttr('minlength', '5');
      // this.assertAttr('size', '20');  //NOTE: failing in IE (TEST_SUITE=sauce)
      // this.assertAttr('tabindex', '30');  //NOTE: failing in IE (TEST_SUITE=sauce)
    }

    ['@test cursor selection range']() {
      // Modifying input.selectionStart, which is utilized in the cursor tests,
      // causes an event in Safari.
      runDestroy(this.owner.lookup('event_dispatcher:main'));

      this.render(`{{input type="text" value=this.value}}`, { value: 'original' });

      let input = this.$input()[0];

      // See https://ember-twiddle.com/33e506329f8176ae874422644d4cc08c?openFiles=components.input-component.js%2Ctemplates.components.input-component.hbs
      // this.assertSelectionRange(8, 8); //NOTE: this is (0, 0) on Firefox (TEST_SUITE=sauce)

      runTask(() => this.rerender());

      // this.assertSelectionRange(8, 8); //NOTE: this is (0, 0) on Firefox (TEST_SUITE=sauce)

      runTask(() => {
        input.selectionStart = 2;
        input.selectionEnd = 4;
      });

      this.assertSelectionRange(2, 4);

      runTask(() => this.rerender());

      this.assertSelectionRange(2, 4);

      // runTask(() => set(this.context, 'value', 'updated'));
      //
      // this.assertSelectionRange(7, 7); //NOTE: this fails in IE, the range is 0 -> 0 (TEST_SUITE=sauce)
      //
      // runTask(() => set(this.context, 'value', 'original'));
      //
      // this.assertSelectionRange(8, 8); //NOTE: this fails in IE, the range is 0 -> 0 (TEST_SUITE=sauce)
    }

    ['@test [DEPRECATED] sends an action with `{{input enter="foo"}}` when <enter> is pressed'](
      assert
    ) {
      assert.expect(4);

      expectDeprecation(() => {
        this.render(`{{input enter='foo'}}`, {
          actions: {
            foo(value, event) {
              assert.ok(true, 'action was triggered');
              if (jQueryDisabled) {
                assert.notOk(event.originalEvent, 'event is not a jQuery.Event');
              } else {
                assert.ok(event instanceof jQuery.Event, 'jQuery event was passed');
              }
            },
          },
        });
      }, 'Passing actions to components as strings (like `{{input enter="foo"}}`) is deprecated. Please use closure actions instead (`{{input enter=(action "foo")}}`). (\'-top-level\' @ L1:C0) ');

      expectDeprecation(() => {
        this.triggerEvent('keyup', { key: 'Enter' });
      }, 'Passing actions to components as strings (like `<Input @enter="foo" />`) is deprecated. Please use closure actions instead (`<Input @enter={{action "foo"}} />`).');
    }

    ['@test sends an action with `{{input enter=(action "foo")}}` when <enter> is pressed'](
      assert
    ) {
      assert.expect(2);

      this.render(`{{input enter=(action 'foo')}}`, {
        actions: {
          foo(value, event) {
            assert.ok(true, 'action was triggered');
            if (jQueryDisabled) {
              assert.notOk(event.originalEvent, 'event is not a jQuery.Event');
            } else {
              assert.ok(event instanceof jQuery.Event, 'jQuery event was passed');
            }
          },
        },
      });

      this.triggerEvent('keyup', {
        key: 'Enter',
      });
    }

    ['@test [DEPRECATED] sends an action with `{{input key-press="foo"}}` is pressed'](assert) {
      assert.expect(4);

      expectDeprecation(() => {
        this.render(`{{input value=this.value key-press='foo'}}`, {
          value: 'initial',

          actions: {
            foo(value, event) {
              assert.ok(true, 'action was triggered');
              if (jQueryDisabled) {
                assert.notOk(event.originalEvent, 'event is not a jQuery.Event');
              } else {
                assert.ok(event instanceof jQuery.Event, 'jQuery event was passed');
              }
            },
          },
        });
      }, /Passing actions to components as strings \(like `({{input key-press="foo"}}|<Input @key-press="foo" \/>)`\) is deprecated\./);

      expectDeprecation(() => {
        this.triggerEvent('keypress', { key: 'A' });
      }, /Passing actions to components as strings \(like `({{input key-press="foo"}}|<Input @key-press="foo" \/>)`\) is deprecated\./);
    }

    ['@test sends an action with `{{input key-press=(action "foo")}}` is pressed'](assert) {
      assert.expect(2);

      this.render(`{{input value=this.value key-press=(action 'foo')}}`, {
        value: 'initial',

        actions: {
          foo(value, event) {
            assert.ok(true, 'action was triggered');
            if (jQueryDisabled) {
              assert.notOk(event.originalEvent, 'event is not a jQuery.Event');
            } else {
              assert.ok(event instanceof jQuery.Event, 'jQuery event was passed');
            }
          },
        },
      });

      this.triggerEvent('keypress', { key: 'A' });
    }

    ['@test sends an action to the parent level when `bubbles=true` is provided'](assert) {
      let bubbled = 0;

      let ParentComponent = Component.extend({
        change() {
          bubbled++;
        },
      });

      this.registerComponent('x-parent', {
        ComponentClass: ParentComponent,
        template: `{{input bubbles=true}}`,
      });

      maybeExpectDeprecation(
        EMBER_MODERNIZED_BUILT_IN_COMPONENTS,
        () => this.render(`{{x-parent}}`),
        'Passing the `@bubbles` argument to <Input> is deprecated.'
      );

      this.triggerEvent('change');

      assert.strictEqual(bubbled, 1, 'bubbled upwards');
    }

    ['@test triggers `focus-in` when focused'](assert) {
      let wasFocused = false;

      this.render(`{{input focus-in=(action 'foo')}}`, {
        actions: {
          foo() {
            wasFocused = true;
          },
        },
      });

      runTask(() => {
        this.$input().focus();
      });

      assert.ok(wasFocused, 'action was triggered');
    }

    ['@test sends `insert-newline` when <enter> is pressed'](assert) {
      assert.expect(2);

      this.render(`{{input insert-newline=(action 'foo')}}`, {
        actions: {
          foo(value, event) {
            assert.ok(true, 'action was triggered');
            if (jQueryDisabled) {
              assert.notOk(event.originalEvent, 'event is not a jQuery.Event');
            } else {
              assert.ok(event instanceof jQuery.Event, 'jQuery event was passed');
            }
          },
        },
      });

      this.triggerEvent('keyup', {
        key: 'Enter',
      });
    }

    ['@test [DEPRECATED] sends an action with `{{input escape-press="foo"}}` when <escape> is pressed'](
      assert
    ) {
      assert.expect(4);

      expectDeprecation(() => {
        this.render(`{{input escape-press='foo'}}`, {
          actions: {
            foo(value, event) {
              assert.ok(true, 'action was triggered');
              if (jQueryDisabled) {
                assert.notOk(event.originalEvent, 'event is not a jQuery.Event');
              } else {
                assert.ok(event instanceof jQuery.Event, 'jQuery event was passed');
              }
            },
          },
        });
      }, 'Passing actions to components as strings (like `{{input escape-press="foo"}}`) is deprecated. Please use closure actions instead (`{{input escape-press=(action "foo")}}`). (\'-top-level\' @ L1:C0) ');

      expectDeprecation(() => {
        this.triggerEvent('keyup', { key: 'Escape' });
      }, 'Passing actions to components as strings (like `<Input @escape-press="foo" />`) is deprecated. Please use closure actions instead (`<Input @escape-press={{action "foo"}} />`).');
    }

    ['@test sends an action with `{{input escape-press=(action "foo")}}` when <escape> is pressed'](
      assert
    ) {
      assert.expect(2);

      this.render(`{{input escape-press=(action 'foo')}}`, {
        actions: {
          foo(value, event) {
            assert.ok(true, 'action was triggered');
            if (jQueryDisabled) {
              assert.notOk(event.originalEvent, 'event is not a jQuery.Event');
            } else {
              assert.ok(event instanceof jQuery.Event, 'jQuery event was passed');
            }
          },
        },
      });

      this.triggerEvent('keyup', { key: 'Escape' });
    }

    ['@test [DEPRECATED] sends an action with `{{input key-down="foo"}}` when a key is pressed'](
      assert
    ) {
      assert.expect(4);

      expectDeprecation(() => {
        this.render(`{{input key-down='foo'}}`, {
          actions: {
            foo(value, event) {
              assert.ok(true, 'action was triggered');
              if (jQueryDisabled) {
                assert.notOk(event.originalEvent, 'event is not a jQuery.Event');
              } else {
                assert.ok(event instanceof jQuery.Event, 'jQuery event was passed');
              }
            },
          },
        });
      }, /Passing actions to components as strings \(like `({{input key-down="foo"}}|<Input @key-down="foo" \/>)`\) is deprecated\./);

      expectDeprecation(() => {
        this.triggerEvent('keydown', { key: 'A' });
      }, 'Passing actions to components as strings (like `<Input @key-down="foo" />`) is deprecated. Please use closure actions instead (`<Input @key-down={{action "foo"}} />`).');
    }

    ['@test sends an action with `{{input key-down=(action "foo")}}` when a key is pressed'](
      assert
    ) {
      assert.expect(2);

      this.render(`{{input key-down=(action 'foo')}}`, {
        actions: {
          foo(value, event) {
            assert.ok(true, 'action was triggered');
            if (jQueryDisabled) {
              assert.notOk(event.originalEvent, 'event is not a jQuery.Event');
            } else {
              assert.ok(event instanceof jQuery.Event, 'jQuery event was passed');
            }
          },
        },
      });

      this.triggerEvent('keydown', { key: 'A' });
    }

    ['@test [DEPRECATED] sends an action with `{{input key-up="foo"}}` when a key is pressed'](
      assert
    ) {
      assert.expect(4);

      expectDeprecation(() => {
        this.render(`{{input key-up='foo'}}`, {
          actions: {
            foo(value, event) {
              assert.ok(true, 'action was triggered');
              if (jQueryDisabled) {
                assert.notOk(event.originalEvent, 'event is not a jQuery.Event');
              } else {
                assert.ok(event instanceof jQuery.Event, 'jQuery event was passed');
              }
            },
          },
        });
      }, /Passing actions to components as strings \(like `({{input key-up="foo"}}|<Input @key-up="foo" \/>)`\) is deprecated\./);

      expectDeprecation(() => {
        this.triggerEvent('keyup', { key: 'A' });
      }, 'Passing actions to components as strings (like `<Input @key-up="foo" />`) is deprecated. Please use closure actions instead (`<Input @key-up={{action "foo"}} />`).');
    }

    ['@test sends an action with `{{input key-up=(action "foo")}}` when a key is pressed'](assert) {
      assert.expect(2);

      this.render(`{{input key-up=(action 'foo')}}`, {
        actions: {
          foo(value, event) {
            assert.ok(true, 'action was triggered');
            if (jQueryDisabled) {
              assert.notOk(event.originalEvent, 'event is not a jQuery.Event');
            } else {
              assert.ok(event instanceof jQuery.Event, 'jQuery event was passed');
            }
          },
        },
      });
      this.triggerEvent('keyup', { key: 'A' });
    }

    ['@test GH#14727 can render a file input after having had render an input of other type']() {
      this.render(`{{input type="text"}}{{input type="file"}}`);

      this.assert.equal(this.$input()[0].type, 'text');
      this.assert.equal(this.$input()[1].type, 'file');
    }

    ['@test sends an action with `{{input EVENT=(action "foo")}}` for native DOM events']() {
      this.assertTriggersNativeDOMEvents();
    }

    ['@test triggers a method with `{{input key-up=this.didTrigger}}`'](assert) {
      this.render(`{{input key-up=this.didTrigger}}`, {
        didTrigger: action(function () {
          assert.ok(true, 'action was triggered');
        }),
      });

      this.triggerEvent('keyup', { key: 'A' });
    }
  }
);

moduleFor(
  'Components test: {{input}} with dynamic type',
  class extends InputRenderingTest {
    ['@test a bound property can be used to determine type']() {
      this.render(`{{input type=this.type}}`, { type: 'password' });

      this.assertAttr('type', 'password');

      runTask(() => this.rerender());

      this.assertAttr('type', 'password');

      runTask(() => set(this.context, 'type', 'text'));

      this.assertAttr('type', 'text');

      runTask(() => set(this.context, 'type', 'password'));

      this.assertAttr('type', 'password');
    }

    ['@test a subexpression can be used to determine type']() {
      this.render(`{{input type=(if this.isTruthy this.trueType this.falseType)}}`, {
        isTruthy: true,
        trueType: 'text',
        falseType: 'password',
      });

      this.assertAttr('type', 'text');

      runTask(() => this.rerender());

      this.assertAttr('type', 'text');

      runTask(() => set(this.context, 'isTruthy', false));

      this.assertAttr('type', 'password');

      runTask(() => set(this.context, 'isTruthy', true));

      this.assertAttr('type', 'text');
    }

    ['@test GH16256 input macro does not modify params in place']() {
      this.registerComponent('my-input', {
        template: `{{input type=this.inputType}}`,
      });

      this.render(`{{my-input inputType=this.firstType}}{{my-input inputType=this.secondType}}`, {
        firstType: 'password',
        secondType: 'email',
      });

      let inputs = this.element.querySelectorAll('input');
      this.assert.equal(inputs.length, 2, 'there are two inputs');
      this.assert.equal(inputs[0].getAttribute('type'), 'password');
      this.assert.equal(inputs[1].getAttribute('type'), 'email');
    }
  }
);

moduleFor(
  `Components test: {{input type='checkbox'}}`,
  class extends InputRenderingTest {
    ['@test [DEPRECATED] dynamic attributes']() {
      maybeExpectDeprecation(
        EMBER_MODERNIZED_BUILT_IN_COMPONENTS,
        () => {
          this.render(
            `{{input
              type='checkbox'
              elementId="test-input"
              ariaRole=this.role
              disabled=this.disabled
              name=this.name
              checked=this.checked
              tabindex=this.tabindex
            }}`,
            {
              role: 'checkbox',
              disabled: false,
              name: 'original-name',
              checked: false,
              tabindex: 10,
            }
          );
        },
        /Passing the `@(elementId|ariaRole|disabled|placeholder|name|maxlength|minlength|size|tabindex)` argument to <Input> is deprecated\./
      );

      this.assertSingleCheckbox();
      this.assertNotDisabled();
      this.assertAttr('id', 'test-input');
      this.assertAttr('role', 'checkbox');
      this.assertAttr('name', 'original-name');
      this.assertAttr('tabindex', '10');

      runTask(() => this.rerender());

      this.assertSingleCheckbox();
      this.assertNotDisabled();
      this.assertAttr('id', 'test-input');
      this.assertAttr('role', 'checkbox');
      this.assertAttr('name', 'original-name');
      this.assertAttr('tabindex', '10');

      maybeExpectDeprecation(
        EMBER_MODERNIZED_BUILT_IN_COMPONENTS,
        () => {
          runTask(() => {
            set(this.context, 'role', 'radio');
            set(this.context, 'disabled', true);
            set(this.context, 'name', 'updated-name');
            set(this.context, 'tabindex', 11);
          });
        },
        /Passing the `@(elementId|ariaRole|disabled|placeholder|name|maxlength|minlength|size|tabindex)` argument to <Input> is deprecated\./
      );

      this.assertSingleCheckbox();
      this.assertDisabled();
      this.assertAttr('id', 'test-input');
      this.assertAttr('role', 'radio');
      this.assertAttr('name', 'updated-name');
      this.assertAttr('tabindex', '11');

      maybeExpectDeprecation(
        EMBER_MODERNIZED_BUILT_IN_COMPONENTS,
        () => {
          runTask(() => {
            set(this.context, 'role', 'checkbox');
            set(this.context, 'disabled', false);
            set(this.context, 'name', 'original-name');
            set(this.context, 'tabindex', 10);
          });
        },
        /Passing the `@(elementId|ariaRole|disabled|placeholder|name|maxlength|minlength|size|tabindex)` argument to <Input> is deprecated\./
      );

      this.assertSingleCheckbox();
      this.assertNotDisabled();
      this.assertAttr('id', 'test-input');
      this.assertAttr('role', 'checkbox');
      this.assertAttr('name', 'original-name');
      this.assertAttr('tabindex', '10');
    }

    ['@feature(!EMBER_MODERNIZED_BUILT_IN_COMPONENTS) `value` property assertion']() {
      expectAssertion(() => {
        this.render(`{{input type="checkbox" value=this.value}}`, {
          value: 'value',
        });
      }, /checkbox.+value.+not supported.+use.+checked.+instead/);
    }

    ['@feature(EMBER_MODERNIZED_BUILT_IN_COMPONENTS) `value` property warning']() {
      let message =
        '`<Input @type="checkbox" />` reflects its checked state via the `@checked` argument. ' +
        'You wrote `<Input @type="checkbox" @value={{...}} />` which is likely not what you intended. ' +
        'Did you mean `<Input @type="checkbox" @checked={{...}} />`?';

      expectWarning(() => {
        this.render(`{{input type="checkbox" value=this.value}}`, {
          value: true,
        });
      }, message);

      this.assert.strictEqual(this.context.value, true);
      this.assertCheckboxIsNotChecked();

      expectWarning(() => this.$input()[0].click(), message);

      this.assert.strictEqual(this.context.value, true);
      this.assertCheckboxIsChecked();
    }

    ['@test with a bound type']() {
      this.render(`{{input type=this.inputType checked=this.isChecked}}`, {
        inputType: 'checkbox',
        isChecked: true,
      });

      this.assertSingleCheckbox();
      this.assertCheckboxIsChecked();

      runTask(() => this.rerender());

      this.assertCheckboxIsChecked();

      runTask(() => set(this.context, 'isChecked', false));

      this.assertCheckboxIsNotChecked();

      runTask(() => set(this.context, 'isChecked', true));

      this.assertCheckboxIsChecked();
    }

    ['@test native click changes check property']() {
      this.render(`{{input type="checkbox"}}`);

      this.assertSingleCheckbox();
      this.assertCheckboxIsNotChecked();
      this.$input()[0].click();
      this.assertCheckboxIsChecked();
      this.$input()[0].click();
      this.assertCheckboxIsNotChecked();
    }

    ['@test [DEPRECATED] with static values']() {
      maybeExpectDeprecation(
        EMBER_MODERNIZED_BUILT_IN_COMPONENTS,
        () => {
          this.render(
            `{{input type="checkbox"
              elementId="test-input"
              ariaRole="radio"
              disabled=false
              tabindex=10
              name="original-name"
              checked=false}}`
          );
        },
        /Passing the `@(elementId|ariaRole|disabled|tabindex|name)` argument to <Input> is deprecated\./
      );

      this.assertSingleCheckbox();
      this.assertCheckboxIsNotChecked();
      this.assertNotDisabled();
      this.assertAttr('id', 'test-input');
      this.assertAttr('role', 'radio');
      this.assertAttr('tabindex', '10');
      this.assertAttr('name', 'original-name');

      runTask(() => this.rerender());

      this.assertSingleCheckbox();
      this.assertCheckboxIsNotChecked();
      this.assertNotDisabled();
      this.assertAttr('id', 'test-input');
      this.assertAttr('role', 'radio');
      this.assertAttr('tabindex', '10');
      this.assertAttr('name', 'original-name');
    }

    ['@test sends an action with `{{input EVENT=(action "foo")}}` for native DOM events']() {
      this.assertTriggersNativeDOMEvents('checkbox');
    }
  }
);

moduleFor(
  `Components test: {{input type='text'}}`,
  class extends InputRenderingTest {
    ['@test [DEPRECATED] null values']() {
      let attributes = ['role', 'disabled', 'placeholder', 'name', 'maxlength', 'size', 'tabindex'];

      maybeExpectDeprecation(
        EMBER_MODERNIZED_BUILT_IN_COMPONENTS,
        () => {
          this.render(
            `{{input type="text"
              elementId="test-input"
              ariaRole=this.role
              disabled=this.disabled
              value=this.value
              placeholder=this.placeholder
              name=this.name
              maxlength=this.maxlength
              size=this.size
              tabindex=this.tabindex}}`,
            {
              role: null,
              disabled: null,
              value: null,
              placeholder: null,
              name: null,
              maxlength: null,
              size: null,
              tabindex: null,
            }
          );
        },
        /Passing the `@(elementId|ariaRole|disabled|placeholder|name|maxlength|size|tabindex)` argument to <Input> is deprecated\./
      );

      this.assertValue('');
      this.assertAttr('id', 'test-input');
      this.assertAllAttrs(attributes, undefined);

      runTask(() => this.rerender());

      this.assertValue('');
      this.assertAttr('id', 'test-input');
      this.assertAllAttrs(attributes, undefined);

      maybeExpectDeprecation(
        EMBER_MODERNIZED_BUILT_IN_COMPONENTS,
        () => {
          runTask(() => {
            set(this.context, 'role', 'search');
            set(this.context, 'disabled', true);
            set(this.context, 'value', 'Updated value');
            set(this.context, 'placeholder', 'Updated placeholder');
            set(this.context, 'name', 'updated-name');
            set(this.context, 'maxlength', 11);
            set(this.context, 'size', 21);
            set(this.context, 'tabindex', 31);
          });
        },
        /Passing the `@(elementId|ariaRole|disabled|placeholder|name|maxlength|size|tabindex)` argument to <Input> is deprecated\./
      );

      this.assertDisabled();
      this.assertValue('Updated value');
      this.assertAttr('id', 'test-input');
      this.assertAttr('role', 'search');
      this.assertAttr('placeholder', 'Updated placeholder');
      this.assertAttr('name', 'updated-name');
      this.assertAttr('maxlength', '11');
      this.assertAttr('size', '21');
      this.assertAttr('tabindex', '31');

      maybeExpectDeprecation(
        EMBER_MODERNIZED_BUILT_IN_COMPONENTS,
        () => {
          runTask(() => {
            set(this.context, 'role', null);
            set(this.context, 'disabled', null);
            set(this.context, 'value', null);
            set(this.context, 'placeholder', null);
            set(this.context, 'name', null);
            set(this.context, 'maxlength', null);
            // set(this.context, 'size', null); //NOTE: this fails with `Error: Failed to set the 'size' property on 'HTMLInputElement': The value provided is 0, which is an invalid size.` (TEST_SUITE=sauce)
            set(this.context, 'tabindex', null);
          });
        },
        /Passing the `@(elementId|ariaRole|disabled|placeholder|name|maxlength|size|tabindex)` argument to <Input> is deprecated\./
      );

      this.assertAttr('disabled', undefined);
      this.assertValue('');
      this.assertAttr('id', 'test-input');
      this.assertAttr('role', undefined);
      // this.assertAttr('placeholder', undefined); //NOTE: this fails with a value of "null" (TEST_SUITE=sauce)
      // this.assertAttr('name', undefined); //NOTE: this fails with a value of "null" (TEST_SUITE=sauce)
      this.assertAttr('maxlength', undefined);
      // this.assertAttr('size', undefined); //NOTE: re-enable once `size` bug above has been addressed
      this.assertAttr('tabindex', undefined);
    }
  }
);

// These are the permutations of the set:
// ['type="range"', 'min="-5" max="50"', 'value="%x"']
[
  'type="range" min="-5" max="50" value="%x"',
  'type="range" value="%x" min="-5" max="50"',
  'min="-5" max="50" type="range" value="%x"',
  'min="-5" max="50" value="%x" type="range"',
  'value="%x" min="-5" max="50" type="range"',
  'value="%x" type="range" min="-5" max="50"',
].forEach((attrs) => {
  moduleFor(
    `[GH#15675] Components test [DEPRECATED]: {{input ${attrs}}}`,
    class extends InputRenderingTest {
      renderInput(value = 25) {
        maybeExpectDeprecation(
          EMBER_MODERNIZED_BUILT_IN_COMPONENTS,
          () => this.render(`{{input ${attrs.replace('%x', value)}}}`),
          /Passing the `@(min|max)` argument to <Input> is deprecated\./
        );
      }

      ['@test value over default max but below set max is kept']() {
        this.renderInput('25');
        this.assertValue('25');
      }

      ['@test value below default min but above set min is kept']() {
        this.renderInput('-2');
        this.assertValue('-2');
      }

      ['@test in the valid default range is kept']() {
        this.renderInput('5');
        this.assertValue('5');
      }

      ['@test value above max is reset to max']() {
        this.renderInput('55');
        this.assertValue('50');
      }

      ['@test value below min is reset to min']() {
        this.renderInput('-10');
        this.assertValue('-5');
      }
    }
  );
});
