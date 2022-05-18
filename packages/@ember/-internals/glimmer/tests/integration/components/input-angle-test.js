import { moduleFor, RenderingTestCase, runDestroy, runTask } from 'internal-test-helpers';
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

  triggerEvent(type, options, selector) {
    let event = document.createEvent('Events');
    event.initEvent(type, true, true);
    Object.assign(event, options);

    let element = this.$(selector || 'input')[0];
    runTask(() => {
      element.dispatchEvent(event);
    });
  }
}

moduleFor(
  'Components test: <Input />',
  class extends InputRenderingTest {
    ['@test a single text field is inserted into the DOM']() {
      this.render(`<Input @type="text" @value={{this.value}} />`, { value: 'hello' });

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
      <Input @type="text" @value={{this.value}}
        role={{this.role}}
        disabled={{this.disabled}}
        placeholder={{this.placeholder}}
        name={{this.name}}
        maxlength={{this.maxlength}}
        minlength={{this.minlength}}
        size={{this.size}}
        tabindex={{this.tabindex}}
      />`,
        {
          value: 'Original value',
          role: 'textbox',
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
      this.assertAttr('role', 'textbox');
      this.assertAttr('placeholder', 'Original placeholder');
      this.assertAttr('name', 'original-name');
      this.assertAttr('maxlength', '10');
      this.assertAttr('minlength', '5');
      // this.assertAttr('size', '20'); //NOTE: failing in IE (TEST_SUITE=sauce)
      // this.assertAttr('tabindex', '30'); //NOTE: failing in IE (TEST_SUITE=sauce)

      runTask(() => {
        set(this.context, 'value', 'Updated value');
        set(this.context, 'role', 'search');
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
      this.assertAttr('role', 'search');
      this.assertAttr('placeholder', 'Updated placeholder');
      this.assertAttr('name', 'updated-name');
      this.assertAttr('maxlength', '11');
      this.assertAttr('minlength', '6');
      // this.assertAttr('size', '21'); //NOTE: failing in IE (TEST_SUITE=sauce)
      // this.assertAttr('tabindex', '31'); //NOTE: failing in IE (TEST_SUITE=sauce)

      runTask(() => {
        set(this.context, 'value', 'Original value');
        set(this.context, 'role', 'textbox');
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
      this.assertAttr('role', 'textbox');
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
        id="test-input"
        role="search"
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

      this.render(`<Input @type="text" @value={{this.value}} />`, { value: 'original' });

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

    ['@test sends an action with `<Input @enter={{action "foo"}} />` when <enter> is pressed'](
      assert
    ) {
      assert.expect(2);

      this.render(`<Input @enter={{action 'foo'}} />`, {
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

      this.render(`<Input @insert-newline={{action 'foo'}} />`, {
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

    ['@test sends an action with `<Input @escape-press={{action "foo"}} />` when <escape> is pressed'](
      assert
    ) {
      assert.expect(2);

      this.render(`<Input @escape-press={{action 'foo'}} />`, {
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
      this.render(`<Input @type="text" /><Input @type="file" />`);

      this.assert.equal(this.$input()[0].type, 'text');
      this.assert.equal(this.$input()[1].type, 'file');
    }
  }
);

moduleFor(
  'Components test: <Input /> with dynamic type',
  class extends InputRenderingTest {
    ['@test a bound property can be used to determine type']() {
      this.render(`<Input @type={{this.type}} />`, { type: 'password' });

      this.assertAttr('type', 'password');

      runTask(() => this.rerender());

      this.assertAttr('type', 'password');

      runTask(() => set(this.context, 'type', 'text'));

      this.assertAttr('type', 'text');

      runTask(() => set(this.context, 'type', 'password'));

      this.assertAttr('type', 'password');
    }

    ['@test a subexpression can be used to determine type']() {
      this.render(`<Input @type={{if this.isTruthy this.trueType this.falseType}} />`, {
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
        template: `<Input @type={{this.inputType}} />`,
      });

      this.render(
        `<MyInput @inputType={{this.firstType}} /><MyInput @inputType={{this.secondType}} />`,
        {
          firstType: 'password',
          secondType: 'email',
        }
      );

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
        `<Input @type='checkbox' @checked={{this.checked}}
          role={{this.role}}
          disabled={{this.disabled}}
          name={{this.name}}
          tabindex={{this.tabindex}}
        />`,
        {
          role: 'checkbox',
          disabled: false,
          name: 'original-name',
          checked: false,
          tabindex: 10,
        }
      );

      this.assertSingleCheckbox();
      this.assertNotDisabled();
      this.assertAttr('role', 'checkbox');
      this.assertAttr('name', 'original-name');
      this.assertAttr('tabindex', '10');

      runTask(() => this.rerender());

      this.assertSingleCheckbox();
      this.assertNotDisabled();
      this.assertAttr('role', 'checkbox');
      this.assertAttr('name', 'original-name');
      this.assertAttr('tabindex', '10');

      runTask(() => {
        set(this.context, 'role', 'radio');
        set(this.context, 'disabled', true);
        set(this.context, 'name', 'updated-name');
        set(this.context, 'tabindex', 11);
      });

      this.assertSingleCheckbox();
      this.assertDisabled();
      this.assertAttr('role', 'radio');
      this.assertAttr('name', 'updated-name');
      this.assertAttr('tabindex', '11');

      runTask(() => {
        set(this.context, 'role', 'checkbox');
        set(this.context, 'disabled', false);
        set(this.context, 'name', 'original-name');
        set(this.context, 'tabindex', 10);
      });

      this.assertSingleCheckbox();
      this.assertNotDisabled();
      this.assertAttr('role', 'checkbox');
      this.assertAttr('name', 'original-name');
      this.assertAttr('tabindex', '10');
    }

    ['`value` property warning']() {
      let message =
        '`<Input @type="checkbox" />` reflects its checked state via the `@checked` argument. ' +
        'You wrote `<Input @type="checkbox" @value={{...}} />` which is likely not what you intended. ' +
        'Did you mean `<Input @type="checkbox" @checked={{...}} />`?';

      expectWarning(() => {
        this.render(`<Input @type="checkbox" @value={{this.value}} />`, {
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
      this.render(`<Input @type={{this.inputType}} @checked={{this.isChecked}} />`, {
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
        `<Input @type="checkbox" @checked={{false}} role="radio" disabled={{false}} tabindex="10" name="original-name" />`
      );

      this.assertSingleCheckbox();
      this.assertCheckboxIsNotChecked();
      this.assertNotDisabled();
      this.assertAttr('role', 'radio');
      this.assertAttr('tabindex', '10');
      this.assertAttr('name', 'original-name');

      runTask(() => this.rerender());

      this.assertSingleCheckbox();
      this.assertCheckboxIsNotChecked();
      this.assertNotDisabled();
      this.assertAttr('tabindex', '10');
      this.assertAttr('name', 'original-name');
    }
  }
);

moduleFor(
  `Components test: <Input @type='text' />`,
  class extends InputRenderingTest {
    ['@test null values (HTML attribute)']() {
      let attributes = ['role', 'disabled', 'placeholder', 'name', 'maxlength', 'size', 'tabindex'];

      this.render(
        `
      <Input @type="text" @value={{this.value}}
        role={{this.role}}
        disabled={{this.disabled}}
        placeholder={{this.placeholder}}
        name={{this.name}}
        maxlength={{this.maxlength}}
        size={{this.size}}
        tabindex={{this.tabindex}}
      />`,
        {
          value: null,
          role: null,
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
        set(this.context, 'role', 'search');
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
      this.assertAttr('role', 'search');
      this.assertAttr('placeholder', 'Updated placeholder');
      this.assertAttr('name', 'updated-name');
      this.assertAttr('maxlength', '11');
      this.assertAttr('size', '21');
      this.assertAttr('tabindex', '31');

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

      this.assertAttr('disabled', undefined);
      this.assertValue('');
      this.assertAttr('role', undefined);
      // this.assertAttr('placeholder', undefined); //NOTE: this fails with a value of "null" (TEST_SUITE=sauce)
      // this.assertAttr('name', undefined); //NOTE: this fails with a value of "null" (TEST_SUITE=sauce)
      this.assertAttr('maxlength', undefined);
      // this.assertAttr('size', undefined); //NOTE: re-enable once `size` bug above has been addressed
      this.assertAttr('tabindex', undefined);
    }
  }
);

function InputAttributesTest(attrs) {
  return class extends InputRenderingTest {
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
  };
}

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
].forEach((attrs) => {
  moduleFor(`[GH#15675] Components test: <Input ${attrs} />`, InputAttributesTest(attrs));
});
