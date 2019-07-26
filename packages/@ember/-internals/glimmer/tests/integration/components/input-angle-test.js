import { RenderingTestCase, moduleFor, runDestroy, runTask } from 'internal-test-helpers';

import { EMBER_GLIMMER_ANGLE_BRACKET_BUILT_INS } from '@ember/canary-features';
import { assign } from '@ember/polyfills';
import { set } from '@ember/-internals/metal';
import { jQueryDisabled, jQuery } from '@ember/-internals/views';

import { Component } from '../../utils/helpers';

if (EMBER_GLIMMER_ANGLE_BRACKET_BUILT_INS) {
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
      names.forEach(name => this.assertAttr(name, expected));
    }

    assertSelectionRange(start, end) {
      let input = this.$input()[0];
      this.assert.equal(
        input.selectionStart,
        start,
        `the cursor start position should be ${start}`
      );
      this.assert.equal(input.selectionEnd, end, `the cursor end position should be ${end}`);
    }

    triggerEvent(type, options, selector) {
      let event = document.createEvent('Events');
      event.initEvent(type, true, true);
      assign(event, options);

      let element = this.$(selector || 'input')[0];
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

      this.registerComponent('test-component', {
        ComponentClass: Component.extend({
          tagName: 'input',
          attributeBindings: ['type'],
        }),
      });

      let triggered = {
        standard: [],
        custom: [],
      };

      let actions = {
        didTrigger(id, event) {
          triggered[id].push(event);
        },
      };

      function argsFor(id) {
        let args = [`id="${id}"`];

        if (type) {
          args.push(`@type="${type}"`);
        }

        Object.keys(events).forEach(event => {
          args.push(`@${events[event]}={{action "didTrigger" "${id}" "${event}"}}`);
        });

        return args.join(' ');
      }

      let template = `
        <Input ${argsFor('standard')} />
        <TestComponent ${argsFor('custom')} />
      `;

      this.render(template, { actions });

      this.assert.ok(this.$('input').length === 2);

      let $standard = this.$('#standard');
      let $custom = this.$('#custom');

      this.assert.equal($standard.type, $custom.type);

      Object.keys(events).forEach(event => {
        this.triggerEvent(event, null, '#standard');
        this.triggerEvent(event, null, '#custom');
      });

      this.assert.ok(
        triggered.standard.length > 10,
        'sanity check that most events are triggered (standard)'
      );

      this.assert.ok(
        triggered.custom.length > 10,
        'sanity check that most events are triggered (custom)'
      );

      this.assert.deepEqual(triggered.standard, triggered.custom, 'called for all events');
    }
  }

  moduleFor(
    'Components test: <Input />',
    class extends InputRenderingTest {
      ['@test a single text field is inserted into the DOM']() {
        this.render(`<Input @type="text" @value={{value}} />`, { value: 'hello' });

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
        this.render(`<Input />`);

        this.assertAttr('type', 'text');

        runTask(() => this.rerender());

        this.assertAttr('type', 'text');
      }

      ['@test dynamic attributes (HTML attribute)']() {
        this.render(
          `
        <Input @type="text" @value={{value}}
          disabled={{disabled}}
          placeholder={{placeholder}}
          name={{name}}
          maxlength={{maxlength}}
          minlength={{minlength}}
          size={{size}}
          tabindex={{tabindex}}
        />`,
          {
            value: 'Original value',
            disabled: false,
            placeholder: 'Original placeholder',
            name: 'original-name',
            maxlength: 10,
            minlength: 5,
            size: 20,
            tabindex: 30,
          }
        );

        this.assertNotDisabled();
        this.assertValue('Original value');
        this.assertAttr('placeholder', 'Original placeholder');
        this.assertAttr('name', 'original-name');
        this.assertAttr('maxlength', '10');
        this.assertAttr('minlength', '5');
        // this.assertAttr('size', '20'); //NOTE: failing in IE  (TEST_SUITE=sauce)
        // this.assertAttr('tabindex', '30'); //NOTE: failing in IE (TEST_SUITE=sauce)

        runTask(() => this.rerender());

        this.assertNotDisabled();
        this.assertValue('Original value');
        this.assertAttr('placeholder', 'Original placeholder');
        this.assertAttr('name', 'original-name');
        this.assertAttr('maxlength', '10');
        this.assertAttr('minlength', '5');
        // this.assertAttr('size', '20'); //NOTE: failing in IE (TEST_SUITE=sauce)
        // this.assertAttr('tabindex', '30'); //NOTE: failing in IE (TEST_SUITE=sauce)

        runTask(() => {
          set(this.context, 'value', 'Updated value');
          set(this.context, 'disabled', true);
          set(this.context, 'placeholder', 'Updated placeholder');
          set(this.context, 'name', 'updated-name');
          set(this.context, 'maxlength', 11);
          set(this.context, 'minlength', 6);
          // set(this.context, 'size', 21); //NOTE: failing in IE (TEST_SUITE=sauce)
          // set(this.context, 'tabindex', 31); //NOTE: failing in IE (TEST_SUITE=sauce)
        });

        this.assertDisabled();
        this.assertValue('Updated value');
        this.assertAttr('placeholder', 'Updated placeholder');
        this.assertAttr('name', 'updated-name');
        this.assertAttr('maxlength', '11');
        this.assertAttr('minlength', '6');
        // this.assertAttr('size', '21'); //NOTE: failing in IE (TEST_SUITE=sauce)
        // this.assertAttr('tabindex', '31'); //NOTE: failing in IE (TEST_SUITE=sauce)

        runTask(() => {
          set(this.context, 'value', 'Original value');
          set(this.context, 'disabled', false);
          set(this.context, 'placeholder', 'Original placeholder');
          set(this.context, 'name', 'original-name');
          set(this.context, 'maxlength', 10);
          set(this.context, 'minlength', 5);
          // set(this.context, 'size', 20); //NOTE: failing in IE (TEST_SUITE=sauce)
          // set(this.context, 'tabindex', 30); //NOTE: failing in IE (TEST_SUITE=sauce)
        });

        this.assertNotDisabled();
        this.assertValue('Original value');
        this.assertAttr('placeholder', 'Original placeholder');
        this.assertAttr('name', 'original-name');
        this.assertAttr('maxlength', '10');
        this.assertAttr('minlength', '5');
        // this.assertAttr('size', '20'); //NOTE: failing in IE (TEST_SUITE=sauce)
        // this.assertAttr('tabindex', '30'); //NOTE: failing in IE (TEST_SUITE=sauce)
      }

      ['@test dynamic attributes (named argument)']() {
        this.render(
          `
        <Input @type="text" @value={{value}}
          @disabled={{disabled}}
          @placeholder={{placeholder}}
          @name={{name}}
          @maxlength={{maxlength}}
          @minlength={{minlength}}
          @size={{size}}
          @tabindex={{tabindex}}
        />`,
          {
            value: 'Original value',
            disabled: false,
            placeholder: 'Original placeholder',
            name: 'original-name',
            maxlength: 10,
            minlength: 5,
            size: 20,
            tabindex: 30,
          }
        );

        this.assertNotDisabled();
        this.assertValue('Original value');
        this.assertAttr('placeholder', 'Original placeholder');
        this.assertAttr('name', 'original-name');
        this.assertAttr('maxlength', '10');
        this.assertAttr('minlength', '5');
        // this.assertAttr('size', '20'); //NOTE: failing in IE  (TEST_SUITE=sauce)
        // this.assertAttr('tabindex', '30'); //NOTE: failing in IE (TEST_SUITE=sauce)

        runTask(() => this.rerender());

        this.assertNotDisabled();
        this.assertValue('Original value');
        this.assertAttr('placeholder', 'Original placeholder');
        this.assertAttr('name', 'original-name');
        this.assertAttr('maxlength', '10');
        this.assertAttr('minlength', '5');
        // this.assertAttr('size', '20'); //NOTE: failing in IE (TEST_SUITE=sauce)
        // this.assertAttr('tabindex', '30'); //NOTE: failing in IE (TEST_SUITE=sauce)

        runTask(() => {
          set(this.context, 'value', 'Updated value');
          set(this.context, 'disabled', true);
          set(this.context, 'placeholder', 'Updated placeholder');
          set(this.context, 'name', 'updated-name');
          set(this.context, 'maxlength', 11);
          set(this.context, 'minlength', 6);
          // set(this.context, 'size', 21); //NOTE: failing in IE (TEST_SUITE=sauce)
          // set(this.context, 'tabindex', 31); //NOTE: failing in IE (TEST_SUITE=sauce)
        });

        this.assertDisabled();
        this.assertValue('Updated value');
        this.assertAttr('placeholder', 'Updated placeholder');
        this.assertAttr('name', 'updated-name');
        this.assertAttr('maxlength', '11');
        this.assertAttr('minlength', '6');
        // this.assertAttr('size', '21'); //NOTE: failing in IE (TEST_SUITE=sauce)
        // this.assertAttr('tabindex', '31'); //NOTE: failing in IE (TEST_SUITE=sauce)

        runTask(() => {
          set(this.context, 'value', 'Original value');
          set(this.context, 'disabled', false);
          set(this.context, 'placeholder', 'Original placeholder');
          set(this.context, 'name', 'original-name');
          set(this.context, 'maxlength', 10);
          set(this.context, 'minlength', 5);
          // set(this.context, 'size', 20); //NOTE: failing in IE (TEST_SUITE=sauce)
          // set(this.context, 'tabindex', 30); //NOTE: failing in IE (TEST_SUITE=sauce)
        });

        this.assertNotDisabled();
        this.assertValue('Original value');
        this.assertAttr('placeholder', 'Original placeholder');
        this.assertAttr('name', 'original-name');
        this.assertAttr('maxlength', '10');
        this.assertAttr('minlength', '5');
        // this.assertAttr('size', '20'); //NOTE: failing in IE (TEST_SUITE=sauce)
        // this.assertAttr('tabindex', '30'); //NOTE: failing in IE (TEST_SUITE=sauce)
      }

      ['@test static attributes (HTML attribute)']() {
        this.render(`
        <Input @type="text" @value="Original value"
          disabled="disabled"
          placeholder="Original placeholder"
          name="original-name"
          maxlength="10"
          minlength="5"
          size="20"
          tabindex="30"
        />`);

        this.assertDisabled();
        this.assertValue('Original value');
        this.assertAttr('placeholder', 'Original placeholder');
        this.assertAttr('name', 'original-name');
        this.assertAttr('maxlength', '10');
        this.assertAttr('minlength', '5');
        // this.assertAttr('size', '20');  //NOTE: failing in IE (TEST_SUITE=sauce)
        // this.assertAttr('tabindex', '30');  //NOTE: failing in IE (TEST_SUITE=sauce)

        runTask(() => this.rerender());

        this.assertDisabled();
        this.assertValue('Original value');
        this.assertAttr('placeholder', 'Original placeholder');
        this.assertAttr('name', 'original-name');
        this.assertAttr('maxlength', '10');
        this.assertAttr('minlength', '5');
        // this.assertAttr('size', '20');  //NOTE: failing in IE (TEST_SUITE=sauce)
        // this.assertAttr('tabindex', '30');  //NOTE: failing in IE (TEST_SUITE=sauce)
      }

      ['@test static attributes (named argument)']() {
        this.render(`
        <Input @type="text" @value="Original value"
          @disabled={{true}}
          @placeholder="Original placeholder"
          @name="original-name"
          @maxlength={{10}}
          @minlength={{5}}
          @size={{20}}
          @tabindex={{30}}
        />`);

        this.assertDisabled();
        this.assertValue('Original value');
        this.assertAttr('placeholder', 'Original placeholder');
        this.assertAttr('name', 'original-name');
        this.assertAttr('maxlength', '10');
        this.assertAttr('minlength', '5');
        // this.assertAttr('size', '20');  //NOTE: failing in IE (TEST_SUITE=sauce)
        // this.assertAttr('tabindex', '30');  //NOTE: failing in IE (TEST_SUITE=sauce)

        runTask(() => this.rerender());

        this.assertDisabled();
        this.assertValue('Original value');
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

        this.render(`<Input @type="text" @value={{value}} />`, { value: 'original' });

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

      ['@test [DEPRECATED] sends an action with `<Input @enter="foo" />` when <enter> is pressed'](
        assert
      ) {
        assert.expect(4);

        expectDeprecation(() => {
          this.render(`<Input @enter="foo" />`, {
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
        }, 'Passing actions to components as strings (like `<Input @enter="foo" />`) is deprecated. Please use closure actions instead (`<Input @enter={{action "foo"}} />`). (\'-top-level\' @ L1:C0) ');

        expectDeprecation(() => {
          this.triggerEvent('keyup', { keyCode: 13 });
        }, 'Passing actions to components as strings (like `<Input @enter="foo" />`) is deprecated. Please use closure actions instead (`<Input @enter={{action "foo"}} />`).');
      }

      ['@test sends an action with `<Input @enter={{action "foo"}} />` when <enter> is pressed'](
        assert
      ) {
        assert.expect(2);

        this.render(`<Input @enter={{action 'foo'}} />`, {
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
          keyCode: 13,
        });
      }

      ['@test [DEPRECATED] sends an action with `<Input @key-press="foo" />` is pressed'](assert) {
        assert.expect(4);

        expectDeprecation(() => {
          this.render(`<Input @value={{value}} @key-press='foo' />`, {
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
        }, 'Passing actions to components as strings (like `<Input @key-press="foo" />`) is deprecated. Please use closure actions instead (`<Input @key-press={{action "foo"}} />`). (\'-top-level\' @ L1:C0) ');

        expectDeprecation(() => {
          this.triggerEvent('keypress', { keyCode: 65 });
        }, 'Passing actions to components as strings (like `<Input @key-press="foo" />`) is deprecated. Please use closure actions instead (`<Input @key-press={{action "foo"}} />`).');
      }

      ['@test sends an action with `<Input @key-press={{action "foo"}} />` is pressed'](assert) {
        assert.expect(2);

        this.render(`<Input @value={{value}} @key-press={{action 'foo'}} />`, {
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

        this.triggerEvent('keypress', { keyCode: 65 });
      }

      ['@test sends an action to the parent level when `bubbles=true` is provided'](assert) {
        assert.expect(1);

        let ParentComponent = Component.extend({
          change() {
            assert.ok(true, 'bubbled upwards');
          },
        });

        this.registerComponent('parent', {
          ComponentClass: ParentComponent,
          template: `<Input @bubbles={{true}} />`,
        });
        this.render(`<Parent />`);

        this.triggerEvent('change');
      }

      ['@test triggers `focus-in` when focused'](assert) {
        let wasFocused = false;

        this.render(`<Input @focus-in={{action 'foo'}} />`, {
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

        this.render(`<Input @insert-newline={{action 'foo'}} />`, {
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
          keyCode: 13,
        });
      }

      ['@test [DEPRECATED] sends an action with `<Input @escape-press="foo" />` when <escape> is pressed'](
        assert
      ) {
        assert.expect(4);

        expectDeprecation(() => {
          this.render(`<Input @escape-press='foo' />`, {
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
        }, 'Passing actions to components as strings (like `<Input @escape-press="foo" />`) is deprecated. Please use closure actions instead (`<Input @escape-press={{action "foo"}} />`). (\'-top-level\' @ L1:C0) ');

        expectDeprecation(() => {
          this.triggerEvent('keyup', { keyCode: 27 });
        }, 'Passing actions to components as strings (like `<Input @escape-press="foo" />`) is deprecated. Please use closure actions instead (`<Input @escape-press={{action "foo"}} />`).');
      }

      ['@test sends an action with `<Input @escape-press={{action "foo"}} />` when <escape> is pressed'](
        assert
      ) {
        assert.expect(2);

        this.render(`<Input @escape-press={{action 'foo'}} />`, {
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

        this.triggerEvent('keyup', { keyCode: 27 });
      }

      ['@test [DEPRECATED] sends an action with `<Input @key-down="foo" />` when a key is pressed'](
        assert
      ) {
        assert.expect(4);

        expectDeprecation(() => {
          this.render(`<Input @key-down='foo' />`, {
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
        }, 'Passing actions to components as strings (like `<Input @key-down="foo" />`) is deprecated. Please use closure actions instead (`<Input @key-down={{action "foo"}} />`). (\'-top-level\' @ L1:C0) ');

        expectDeprecation(() => {
          this.triggerEvent('keydown', { keyCode: 65 });
        }, 'Passing actions to components as strings (like `<Input @key-down="foo" />`) is deprecated. Please use closure actions instead (`<Input @key-down={{action "foo"}} />`).');
      }

      ['@test sends an action with `<Input @key-down={{action "foo"}} />` when a key is pressed'](
        assert
      ) {
        assert.expect(2);

        this.render(`<Input @key-down={{action 'foo'}} />`, {
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

        this.triggerEvent('keydown', { keyCode: 65 });
      }

      ['@test [DEPRECATED] sends an action with `<Input @key-up="foo" />` when a key is pressed'](
        assert
      ) {
        assert.expect(4);

        expectDeprecation(() => {
          this.render(`<Input @key-up='foo' />`, {
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
        }, 'Passing actions to components as strings (like `<Input @key-up="foo" />`) is deprecated. Please use closure actions instead (`<Input @key-up={{action "foo"}} />`). (\'-top-level\' @ L1:C0) ');

        expectDeprecation(() => {
          this.triggerEvent('keyup', { keyCode: 65 });
        }, 'Passing actions to components as strings (like `<Input @key-up="foo" />`) is deprecated. Please use closure actions instead (`<Input @key-up={{action "foo"}} />`).');
      }

      ['@test sends an action with `<Input @key-up={{action "foo"}} />` when a key is pressed'](
        assert
      ) {
        assert.expect(2);

        this.render(`<Input @key-up={{action 'foo'}} />`, {
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
        this.triggerEvent('keyup', { keyCode: 65 });
      }

      ['@test GH#14727 can render a file input after having had render an input of other type']() {
        this.render(`<Input @type="text" /><Input @type="file" />`);

        this.assert.equal(this.$input()[0].type, 'text');
        this.assert.equal(this.$input()[1].type, 'file');
      }

      ['@test sends an action with `<Input EVENT={{action "foo"}} />` for native DOM events']() {
        this.assertTriggersNativeDOMEvents();
      }
    }
  );

  moduleFor(
    'Components test: <Input /> with dynamic type',
    class extends InputRenderingTest {
      ['@test a bound property can be used to determine type']() {
        this.render(`<Input @type={{type}} />`, { type: 'password' });

        this.assertAttr('type', 'password');

        runTask(() => this.rerender());

        this.assertAttr('type', 'password');

        runTask(() => set(this.context, 'type', 'text'));

        this.assertAttr('type', 'text');

        runTask(() => set(this.context, 'type', 'password'));

        this.assertAttr('type', 'password');
      }

      ['@test a subexpression can be used to determine type']() {
        this.render(`<Input @type={{if isTruthy trueType falseType}} />`, {
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
          template: `<Input @type={{inputType}} />`,
        });

        this.render(`<MyInput @inputType={{firstType}} /><MyInput @inputType={{secondType}} />`, {
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
    `Components test: <Input @type='checkbox' />`,
    class extends InputRenderingTest {
      ['@test dynamic attributes (HTML attribute)']() {
        this.render(
          `<Input @type='checkbox' @checked={{checked}}
            disabled={{disabled}}
            name={{name}}
            tabindex={{tabindex}}
          />`,
          {
            disabled: false,
            name: 'original-name',
            checked: false,
            tabindex: 10,
          }
        );

        this.assertSingleCheckbox();
        this.assertNotDisabled();
        this.assertAttr('name', 'original-name');
        this.assertAttr('tabindex', '10');

        runTask(() => this.rerender());

        this.assertSingleCheckbox();
        this.assertNotDisabled();
        this.assertAttr('name', 'original-name');
        this.assertAttr('tabindex', '10');

        runTask(() => {
          set(this.context, 'disabled', true);
          set(this.context, 'name', 'updated-name');
          set(this.context, 'tabindex', 11);
        });

        this.assertSingleCheckbox();
        this.assertDisabled();
        this.assertAttr('name', 'updated-name');
        this.assertAttr('tabindex', '11');

        runTask(() => {
          set(this.context, 'disabled', false);
          set(this.context, 'name', 'original-name');
          set(this.context, 'tabindex', 10);
        });

        this.assertSingleCheckbox();
        this.assertNotDisabled();
        this.assertAttr('name', 'original-name');
        this.assertAttr('tabindex', '10');
      }

      ['@test dynamic attributes (named argument)']() {
        this.render(
          `<Input @type='checkbox' @checked={{checked}}
            @disabled={{disabled}}
            @name={{name}}
            @tabindex={{tabindex}}
          />`,
          {
            disabled: false,
            name: 'original-name',
            checked: false,
            tabindex: 10,
          }
        );

        this.assertSingleCheckbox();
        this.assertNotDisabled();
        this.assertAttr('name', 'original-name');
        this.assertAttr('tabindex', '10');

        runTask(() => this.rerender());

        this.assertSingleCheckbox();
        this.assertNotDisabled();
        this.assertAttr('name', 'original-name');
        this.assertAttr('tabindex', '10');

        runTask(() => {
          set(this.context, 'disabled', true);
          set(this.context, 'name', 'updated-name');
          set(this.context, 'tabindex', 11);
        });

        this.assertSingleCheckbox();
        this.assertDisabled();
        this.assertAttr('name', 'updated-name');
        this.assertAttr('tabindex', '11');

        runTask(() => {
          set(this.context, 'disabled', false);
          set(this.context, 'name', 'original-name');
          set(this.context, 'tabindex', 10);
        });

        this.assertSingleCheckbox();
        this.assertNotDisabled();
        this.assertAttr('name', 'original-name');
        this.assertAttr('tabindex', '10');
      }

      ['@test `value` property assertion']() {
        expectAssertion(() => {
          this.render(`<Input @type="checkbox" @value={{value}} />`, {
            value: 'value',
          });
        }, /checkbox.+@value.+not supported.+use.+@checked.+instead/);
      }

      ['@test with a bound type']() {
        this.render(`<Input @type={{inputType}} @checked={{isChecked}} />`, {
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
        this.render(`<Input @type="checkbox" />`);

        this.assertSingleCheckbox();
        this.assertCheckboxIsNotChecked();
        this.$input()[0].click();
        this.assertCheckboxIsChecked();
        this.$input()[0].click();
        this.assertCheckboxIsNotChecked();
      }

      ['@test with static values (HTML attribute)']() {
        this.render(
          `<Input @type="checkbox" @checked={{false}} disabled={{false}} tabindex="10" name="original-name" />`
        );

        this.assertSingleCheckbox();
        this.assertCheckboxIsNotChecked();
        this.assertNotDisabled();
        this.assertAttr('tabindex', '10');
        this.assertAttr('name', 'original-name');

        runTask(() => this.rerender());

        this.assertSingleCheckbox();
        this.assertCheckboxIsNotChecked();
        this.assertNotDisabled();
        this.assertAttr('tabindex', '10');
        this.assertAttr('name', 'original-name');
      }

      ['@test with static values (named argument)']() {
        this.render(
          `<Input @type="checkbox" @checked={{false}} @disabled={{false}} @tabindex={{10}} @name="original-name" />`
        );

        this.assertSingleCheckbox();
        this.assertCheckboxIsNotChecked();
        this.assertNotDisabled();
        this.assertAttr('tabindex', '10');
        this.assertAttr('name', 'original-name');

        runTask(() => this.rerender());

        this.assertSingleCheckbox();
        this.assertCheckboxIsNotChecked();
        this.assertNotDisabled();
        this.assertAttr('tabindex', '10');
        this.assertAttr('name', 'original-name');
      }

      ['@test sends an action with `<Input EVENT={{action "foo"}} />` for native DOM events']() {
        this.assertTriggersNativeDOMEvents('checkbox');
      }
    }
  );

  moduleFor(
    `Components test: <Input @type='text' />`,
    class extends InputRenderingTest {
      ['@test null values (HTML attribute)']() {
        let attributes = ['disabled', 'placeholder', 'name', 'maxlength', 'size', 'tabindex'];

        this.render(
          `
        <Input @type="text" @value={{value}}
          disabled={{disabled}}
          placeholder={{placeholder}}
          name={{name}}
          maxlength={{maxlength}}
          size={{size}}
          tabindex={{tabindex}}
        />`,
          {
            value: null,
            disabled: null,
            placeholder: null,
            name: null,
            maxlength: null,
            size: null,
            tabindex: null,
          }
        );

        this.assertValue('');
        this.assertAllAttrs(attributes, undefined);

        runTask(() => this.rerender());

        this.assertValue('');
        this.assertAllAttrs(attributes, undefined);

        runTask(() => {
          set(this.context, 'disabled', true);
          set(this.context, 'value', 'Updated value');
          set(this.context, 'placeholder', 'Updated placeholder');
          set(this.context, 'name', 'updated-name');
          set(this.context, 'maxlength', 11);
          set(this.context, 'size', 21);
          set(this.context, 'tabindex', 31);
        });

        this.assertDisabled();
        this.assertValue('Updated value');
        this.assertAttr('placeholder', 'Updated placeholder');
        this.assertAttr('name', 'updated-name');
        this.assertAttr('maxlength', '11');
        this.assertAttr('size', '21');
        this.assertAttr('tabindex', '31');

        runTask(() => {
          set(this.context, 'disabled', null);
          set(this.context, 'value', null);
          set(this.context, 'placeholder', null);
          set(this.context, 'name', null);
          set(this.context, 'maxlength', null);
          // set(this.context, 'size', null); //NOTE: this fails with `Error: Failed to set the 'size' property on 'HTMLInputElement': The value provided is 0, which is an invalid size.` (TEST_SUITE=sauce)
          set(this.context, 'tabindex', null);
        });

        this.assertAttr('disabled', undefined);
        this.assertValue('');
        // this.assertAttr('placeholder', undefined); //NOTE: this fails with a value of "null" (TEST_SUITE=sauce)
        // this.assertAttr('name', undefined); //NOTE: this fails with a value of "null" (TEST_SUITE=sauce)
        this.assertAttr('maxlength', undefined);
        // this.assertAttr('size', undefined); //NOTE: re-enable once `size` bug above has been addressed
        this.assertAttr('tabindex', undefined);
      }

      ['@test null values (named argument)']() {
        let attributes = ['disabled', 'placeholder', 'name', 'maxlength', 'size', 'tabindex'];

        this.render(
          `
        <Input @type="text" @value={{value}}
          @disabled={{disabled}}
          @placeholder={{placeholder}}
          @name={{name}}
          @maxlength={{maxlength}}
          @size={{size}}
          @tabindex={{tabindex}}
        />`,
          {
            value: null,
            disabled: null,
            placeholder: null,
            name: null,
            maxlength: null,
            size: null,
            tabindex: null,
          }
        );

        this.assertValue('');
        this.assertAllAttrs(attributes, undefined);

        runTask(() => this.rerender());

        this.assertValue('');
        this.assertAllAttrs(attributes, undefined);

        runTask(() => {
          set(this.context, 'disabled', true);
          set(this.context, 'value', 'Updated value');
          set(this.context, 'placeholder', 'Updated placeholder');
          set(this.context, 'name', 'updated-name');
          set(this.context, 'maxlength', 11);
          set(this.context, 'size', 21);
          set(this.context, 'tabindex', 31);
        });

        this.assertDisabled();
        this.assertValue('Updated value');
        this.assertAttr('placeholder', 'Updated placeholder');
        this.assertAttr('name', 'updated-name');
        this.assertAttr('maxlength', '11');
        this.assertAttr('size', '21');
        this.assertAttr('tabindex', '31');

        runTask(() => {
          set(this.context, 'disabled', null);
          set(this.context, 'value', null);
          set(this.context, 'placeholder', null);
          set(this.context, 'name', null);
          set(this.context, 'maxlength', null);
          // set(this.context, 'size', null); //NOTE: this fails with `Error: Failed to set the 'size' property on 'HTMLInputElement': The value provided is 0, which is an invalid size.` (TEST_SUITE=sauce)
          set(this.context, 'tabindex', null);
        });

        this.assertAttr('disabled', undefined);
        this.assertValue('');
        // this.assertAttr('placeholder', undefined); //NOTE: this fails with a value of "null" (TEST_SUITE=sauce)
        // this.assertAttr('name', undefined); //NOTE: this fails with a value of "null" (TEST_SUITE=sauce)
        this.assertAttr('maxlength', undefined);
        // this.assertAttr('size', undefined); //NOTE: re-enable once `size` bug above has been addressed
        this.assertAttr('tabindex', undefined);
      }
    }
  );

  // These are the permutations of the set:
  // ['type="range"', 'min="-5" max="50"', value="%x"']
  [
    // HTML attribute
    '@type="range" min="-5" max="50" @value="%x"',
    '@type="range" @value="%x" min="-5" max="50"',
    'min="-5" max="50" @type="range" @value="%x"',
    'min="-5" max="50" @value="%x" @type="range"',
    '@value="%x" min="-5" max="50" @type="range"',
    '@value="%x" @type="range" min="-5" max="50"',

    // Named argument
    '@type="range" @min="-5" @max="50" @value="%x"',
    '@type="range" @value="%x" @min="-5" @max="50"',
    '@min="-5" @max="50" @type="range" @value="%x"',
    '@min="-5" @max="50" @value="%x" @type="range"',
    '@value="%x" @min="-5" @max="50" @type="range"',
    '@value="%x" @type="range" @min="-5" @max="50"',
  ].forEach(attrs => {
    moduleFor(
      `[GH#15675] Components test: <Input ${attrs} />`,
      class extends InputRenderingTest {
        renderInput(value = 25) {
          this.render(`<Input ${attrs.replace('%x', value)} />`);
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
} else {
  moduleFor(
    'Components test: <Input>',
    class extends RenderingTestCase {
      ['@test it is not allowed']() {
        expectAssertion(() => {
          this.render(`<Input />`);
        }, 'Invoking `{{input}}` using angle bracket syntax or `component` helper is not yet supported.');
      }
    }
  );
}
