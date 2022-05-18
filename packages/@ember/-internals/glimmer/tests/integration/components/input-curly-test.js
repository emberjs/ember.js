import { RenderingTestCase, moduleFor, runDestroy, runTask } from 'internal-test-helpers';

import { set } from '@ember/object';

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
    Object.assign(event, options);

    let element = this.$input()[0];
    runTask(() => {
      element.dispatchEvent(event);
    });
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

    ['@test sends an action with `{{input enter=(action "foo")}}` when <enter> is pressed'](
      assert
    ) {
      assert.expect(2);

      this.render(`{{input enter=(action 'foo')}}`, {
        actions: {
          foo(value, event) {
            assert.ok(true, 'action was triggered');
            assert.ok(event instanceof Event, 'Native event was passed');
          },
        },
      });

      this.triggerEvent('keyup', {
        key: 'Enter',
      });
    }

    ['@test sends `insert-newline` when <enter> is pressed'](assert) {
      assert.expect(2);

      this.render(`{{input insert-newline=(action 'foo')}}`, {
        actions: {
          foo(value, event) {
            assert.ok(true, 'action was triggered');
            assert.ok(event instanceof Event, 'Native event was passed');
          },
        },
      });

      this.triggerEvent('keyup', {
        key: 'Enter',
      });
    }

    ['@test sends an action with `{{input escape-press=(action "foo")}}` when <escape> is pressed'](
      assert
    ) {
      assert.expect(2);

      this.render(`{{input escape-press=(action 'foo')}}`, {
        actions: {
          foo(value, event) {
            assert.ok(true, 'action was triggered');
            assert.ok(event instanceof Event, 'Native event was passed');
          },
        },
      });

      this.triggerEvent('keyup', { key: 'Escape' });
    }

    ['@test GH#14727 can render a file input after having had render an input of other type']() {
      this.render(`{{input type="text"}}{{input type="file"}}`);

      this.assert.equal(this.$input()[0].type, 'text');
      this.assert.equal(this.$input()[1].type, 'file');
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
    ['`value` property warning']() {
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
  }
);
