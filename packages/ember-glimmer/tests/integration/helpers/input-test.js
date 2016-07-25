import { set } from 'ember-metal/property_set';
import { TextField, Checkbox, Component } from '../../utils/helpers';
import { RenderingTest, moduleFor } from '../../utils/test-case';
import { runDestroy } from 'ember-runtime/tests/utils';
import assign from 'ember-metal/assign';

class InputRenderingTest extends RenderingTest {
  constructor() {
    super();

    this.registerComponent('-text-field', { ComponentClass: TextField });
    this.registerComponent('-checkbox', { ComponentClass: Checkbox });
  }

  $input() {
    return this.$('input');
  }

  inputID() {
    return this.$input().prop('id');
  }

  assertDisabled() {
    this.assert.ok(this.$('input').is(':disabled'), 'The input is disabled');
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
    this.assert.equal(this.$input().attr(name), expected, `the input ${name} attribute has the value '${expected}'`);
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
    this.runTask(() => {
      element.dispatchEvent(event);
    });
  }
}

moduleFor('Helpers test: {{input}}', class extends InputRenderingTest {

  ['@test a single text field is inserted into the DOM'](assert) {
    this.render(`{{input type="text" value=value}}`, { value: 'hello' });

    let id = this.inputID();

    this.assertValue('hello');
    this.assertSingleInput();

    this.runTask(() => this.rerender());

    this.assertValue('hello');
    this.assertSingleInput();
    this.assertInputId(id);

    this.runTask(() => set(this.context, 'value', 'goodbye'));

    this.assertValue('goodbye');
    this.assertSingleInput();
    this.assertInputId(id);

    this.runTask(() => set(this.context, 'value', 'hello'));

    this.assertValue('hello');
    this.assertSingleInput();
    this.assertInputId(id);
  }

  ['@test default type']() {
    this.render(`{{input}}`);

    this.assertAttr('type', 'text');

    this.runTask(() => this.rerender());

    this.assertAttr('type', 'text');
  }

  ['@test dynamic attributes']() {
    this.render(`
      {{input type="text"
        disabled=disabled
        value=value
        placeholder=placeholder
        name=name
        maxlength=maxlength
        size=size
        tabindex=tabindex
      }}`, {
        disabled: false,
        value: 'Original value',
        placeholder: 'Original placeholder',
        name: 'original-name',
        maxlength: 10,
        size: 20,
        tabindex: 30
      }
    );

    this.assertNotDisabled();
    this.assertValue('Original value');
    this.assertAttr('placeholder', 'Original placeholder');
    this.assertAttr('name', 'original-name');
    this.assertAttr('maxlength', '10');
    // this.assertAttr('size', '20'); //NOTE: failing in IE  (TEST_SUITE=sauce)
    // this.assertAttr('tabindex', '30'); //NOTE: failing in IE (TEST_SUITE=sauce)

    this.runTask(() => this.rerender());

    this.assertNotDisabled();
    this.assertValue('Original value');
    this.assertAttr('placeholder', 'Original placeholder');
    this.assertAttr('name', 'original-name');
    this.assertAttr('maxlength', '10');
    // this.assertAttr('size', '20'); //NOTE: failing in IE (TEST_SUITE=sauce)
    // this.assertAttr('tabindex', '30'); //NOTE: failing in IE (TEST_SUITE=sauce)

    this.runTask(() => {
      set(this.context, 'value', 'Updated value');
      set(this.context, 'disabled', true);
      set(this.context, 'placeholder', 'Updated placeholder');
      set(this.context, 'name', 'updated-name');
      set(this.context, 'maxlength', 11);
      // set(this.context, 'size', 21); //NOTE: failing in IE (TEST_SUITE=sauce)
      // set(this.context, 'tabindex', 31); //NOTE: failing in IE (TEST_SUITE=sauce)
    });

    this.assertDisabled();
    this.assertValue('Updated value');
    this.assertAttr('placeholder', 'Updated placeholder');
    this.assertAttr('name', 'updated-name');
    this.assertAttr('maxlength', '11');
    // this.assertAttr('size', '21'); //NOTE: failing in IE (TEST_SUITE=sauce)
    // this.assertAttr('tabindex', '31'); //NOTE: failing in IE (TEST_SUITE=sauce)

    this.runTask(() => {
      set(this.context, 'value', 'Original value');
      set(this.context, 'disabled', false);
      set(this.context, 'placeholder', 'Original placeholder');
      set(this.context, 'name', 'original-name');
      set(this.context, 'maxlength', 10);
      // set(this.context, 'size', 20); //NOTE: failing in IE (TEST_SUITE=sauce)
      // set(this.context, 'tabindex', 30); //NOTE: failing in IE (TEST_SUITE=sauce)
    });

    this.assertNotDisabled();
    this.assertValue('Original value');
    this.assertAttr('placeholder', 'Original placeholder');
    this.assertAttr('name', 'original-name');
    this.assertAttr('maxlength', '10');
    // this.assertAttr('size', '20'); //NOTE: failing in IE (TEST_SUITE=sauce)
    // this.assertAttr('tabindex', '30'); //NOTE: failing in IE (TEST_SUITE=sauce)
  }

  ['@test static attributes']() {
    this.render(`
      {{input type="text"
        disabled=true
        value="Original value"
        placeholder="Original placeholder"
        name="original-name"
        maxlength=10
        size=20
        tabindex=30
      }}`
    );

    this.assertDisabled();
    this.assertValue('Original value');
    this.assertAttr('placeholder', 'Original placeholder');
    this.assertAttr('name', 'original-name');
    this.assertAttr('maxlength', '10');
    // this.assertAttr('size', '20');  //NOTE: failing in IE (TEST_SUITE=sauce)
    // this.assertAttr('tabindex', '30');  //NOTE: failing in IE (TEST_SUITE=sauce)

    this.runTask(() => this.rerender());

    this.assertDisabled();
    this.assertValue('Original value');
    this.assertAttr('placeholder', 'Original placeholder');
    this.assertAttr('name', 'original-name');
    this.assertAttr('maxlength', '10');
    // this.assertAttr('size', '20');  //NOTE: failing in IE (TEST_SUITE=sauce)
    // this.assertAttr('tabindex', '30');  //NOTE: failing in IE (TEST_SUITE=sauce)
  }

  ['@test cursor selection range'](assert) {
    // Modifying input.selectionStart, which is utilized in the cursor tests,
    // causes an event in Safari.
    runDestroy(this.owner.lookup('event_dispatcher:main'));

    this.render(`{{input type="text" value=value}}`, { value: 'original' });

    let input = this.$input()[0];

    // See https://ember-twiddle.com/33e506329f8176ae874422644d4cc08c?openFiles=components.input-component.js%2Ctemplates.components.input-component.hbs
    // this.assertSelectionRange(8, 8); //NOTE: this is (0, 0) on Firefox (TEST_SUITE=sauce)

    this.runTask(() => this.rerender());

    // this.assertSelectionRange(8, 8); //NOTE: this is (0, 0) on Firefox (TEST_SUITE=sauce)

    this.runTask(() => {
      input.selectionStart = 2;
      input.selectionEnd = 4;
    });

    this.assertSelectionRange(2, 4);

    this.runTask(() => this.rerender());

    this.assertSelectionRange(2, 4);

    // this.runTask(() => set(this.context, 'value', 'updated'));
    //
    // this.assertSelectionRange(7, 7); //NOTE: this fails in IE, the range is 0 -> 0 (TEST_SUITE=sauce)
    //
    // this.runTask(() => set(this.context, 'value', 'original'));
    //
    // this.assertSelectionRange(8, 8); //NOTE: this fails in IE, the range is 0 -> 0 (TEST_SUITE=sauce)
  }

  ['@test specifying `on="someevent" action="foo"` results in a deprecation warning']() {
    expectDeprecation(() => {
      this.render(`{{input on="focus-in" action="doFoo" value="hello"}}`);
    }, `Using '{{input on="focus-in" action="doFoo"}}' ('-top-level' @ L1:C0) is deprecated. Please use '{{input focus-in="doFoo"}}' instead.`);
  }

  ['@test sends an action with `{{input action="foo"}}` when <enter> is pressed [DEPRECATED]'](assert) {
    assert.expect(2);

    expectDeprecation(() => {
      this.render(`{{input action='foo'}}`, {
        actions: {
          foo() {
            assert.ok(true, 'action was triggered');
          }
        }
      });
    }, /Please use '{{input enter="foo"}}' instead/);

    this.triggerEvent('keyup', {
      keyCode: 13
    });
  }

  ['@test sends an action with `{{input enter="foo"}}` when <enter> is pressed'](assert) {
    assert.expect(1);

    this.render(`{{input enter='foo'}}`, {
      actions: {
        foo() {
          assert.ok(true, 'action was triggered');
        }
      }
    });

    this.triggerEvent('keyup', {
      keyCode: 13
    });
  }

  ['@test sends an action with `{{input key-press="foo"}}` is pressed'](assert) {
    assert.expect(1);

    this.render(`{{input value=value key-press='foo'}}`, {
      value: 'initial',

      actions: {
        foo() {
          assert.ok(true, 'action was triggered');
        }
      }
    });

    this.triggerEvent('keypress', {
      keyCode: 65
    });
  }

  ['@test sends an action to the parent level when `bubbles=true` is provided'](assert) {
    assert.expect(1);

    let ParentComponent = Component.extend({
      change() {
        assert.ok(true, 'bubbled upwards');
      }
    });

    this.registerComponent('x-parent', {
      ComponentClass: ParentComponent,
      template: `{{input bubbles=true}}`
    });
    this.render(`{{x-parent}}`);

    this.triggerEvent('change');
  }

  ['@test triggers `focus-in` when focused'](assert) {
    assert.expect(1);

    this.render(`{{input focus-in='foo'}}`, {
      actions: {
        foo() {
          assert.ok(true, 'action was triggered');
        }
      }
    });

    this.runTask(() => { this.$input().trigger('focusin'); });
  }

  ['@test sends `insert-newline` when <enter> is pressed'](assert) {
    assert.expect(1);

    this.render(`{{input insert-newline='foo'}}`, {
      actions: {
        foo() {
          assert.ok(true, 'action was triggered');
        }
      }
    });

    this.triggerEvent('keyup', {
      keyCode: 13
    });
  }

  ['@test sends an action with `{{input escape-press="foo"}}` when <escape> is pressed'](assert) {
    assert.expect(1);

    this.render(`{{input escape-press='foo'}}`, {
      actions: {
        foo() {
          assert.ok(true, 'action was triggered');
        }
      }
    });

    this.triggerEvent('keyup', {
      keyCode: 27
    });
  }

  ['@test sends an action with `{{input key-down="foo"}}` when a key is pressed'](assert) {
    assert.expect(1);

    this.render(`{{input key-down='foo'}}`, {
      actions: {
        foo() {
          assert.ok(true, 'action was triggered');
        }
      }
    });

    this.triggerEvent('keydown', {
      keyCode: 65
    });
  }

  ['@test sends an action with `{{input key-up="foo"}}` when a key is pressed'](assert) {
    assert.expect(1);

    this.render(`{{input key-up='foo'}}`, {
      actions: {
        foo() {
          assert.ok(true, 'action was triggered');
        }
      }
    });

    this.triggerEvent('keyup', {
      keyCode: 65
    });
  }
});

moduleFor('Helpers test: {{input}} with dynamic type', class extends InputRenderingTest {

  ['@test a bound property can be used to determine type']() {
    this.render(`{{input type=type}}`, { type: 'password' });

    this.assertAttr('type', 'password');

    this.runTask(() => this.rerender());

    this.assertAttr('type', 'password');

    this.runTask(() => set(this.context, 'type', 'text'));

    this.assertAttr('type', 'text');

    this.runTask(() => set(this.context, 'type', 'password'));

    this.assertAttr('type', 'password');
  }

});

moduleFor(`Helpers test: {{input type='checkbox'}}`, class extends InputRenderingTest {

  ['@test dynamic attributes']() {
    this.render(`{{input
      type='checkbox'
      disabled=disabled
      name=name
      checked=checked
      tabindex=tabindex
    }}`, {
      disabled: false,
      name: 'original-name',
      checked: false,
      tabindex: 10
    });

    this.assertSingleCheckbox();
    this.assertNotDisabled();
    this.assertAttr('name', 'original-name');
    this.assertAttr('tabindex', '10');

    this.runTask(() => this.rerender());

    this.assertSingleCheckbox();
    this.assertNotDisabled();
    this.assertAttr('name', 'original-name');
    this.assertAttr('tabindex', '10');

    this.runTask(() => {
      set(this.context, 'disabled', true);
      set(this.context, 'name', 'updated-name');
      set(this.context, 'tabindex', 11);
    });

    this.assertSingleCheckbox();
    this.assertDisabled();
    this.assertAttr('name', 'updated-name');
    this.assertAttr('tabindex', '11');

    this.runTask(() => {
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
      this.render(`{{input type="checkbox" value=value}}`, { value: 'value' });
    }, /you must use `checked=/);
  }

  ['@test with a bound type'](assert) {
    this.render(`{{input type=inputType checked=isChecked}}`, { inputType: 'checkbox', isChecked: true });

    this.assertSingleCheckbox();
    this.assertCheckboxIsChecked();

    this.runTask(() => this.rerender());

    this.assertCheckboxIsChecked();

    this.runTask(() => set(this.context, 'isChecked', false));

    this.assertCheckboxIsNotChecked();

    this.runTask(() => set(this.context, 'isChecked', true));

    this.assertCheckboxIsChecked();
  }

  ['@test with static values'](assert) {
    this.render(`{{input type="checkbox" disabled=false tabindex=10 name="original-name" checked=false}}`);

    this.assertSingleCheckbox();
    this.assertCheckboxIsNotChecked();
    this.assertNotDisabled();
    this.assertAttr('tabindex', '10');
    this.assertAttr('name', 'original-name');

    this.runTask(() => this.rerender());

    this.assertSingleCheckbox();
    this.assertCheckboxIsNotChecked();
    this.assertNotDisabled();
    this.assertAttr('tabindex', '10');
    this.assertAttr('name', 'original-name');
  }

});

moduleFor(`Helpers test: {{input type='text'}}`, class extends InputRenderingTest {

  ['@test null values'](assert) {
    let attributes = ['disabled', 'placeholder', 'name', 'maxlength', 'size', 'tabindex'];

    this.render(`
      {{input type="text"
        disabled=disabled
        value=value
        placeholder=placeholder
        name=name
        maxlength=maxlength
        size=size
        tabindex=tabindex
      }}`, {
        disabled: null,
        value: null,
        placeholder: null,
        name: null,
        maxlength: null,
        size: null,
        tabindex: null
      }
    );

    this.assertValue('');
    this.assertAllAttrs(attributes, undefined);

    this.runTask(() => this.rerender());

    this.assertValue('');
    this.assertAllAttrs(attributes, undefined);

    this.runTask(() => {
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

    this.runTask(() => {
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
});
