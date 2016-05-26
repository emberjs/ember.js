import { set } from 'ember-metal/property_set';
import { TextField, Checkbox } from '../../utils/helpers';
import { RenderingTest, moduleFor } from '../../utils/test-case';
import { Component } from '../../utils/helpers';

class InputRenderingTest extends RenderingTest {
  constructor() {
    super();

    this.registerComponent('-text-field', { ComponentClass: TextField });
    this.registerComponent('-checkbox', { ComponentClass: Checkbox });
  }
}

const staticTemplate = '{{input type="text" disabled=true value="hello" placeholder="Enter some text" name="some-name" maxlength=30 size=30 tabindex=5}}';

const checkboxContext = {
  tab: 6,
  name: 'hello',
  val: false
};
const checkboxTemplate = '{{input type="checkbox" disabled=disabled tabindex=tab name=name checked=val}}';


const defaultTemplate = '{{input type="text" disabled=disabled value=val placeholder=place name=name maxlength=max size=size tabindex=tab}}';
const defaultContext = {
  val: 'hello',
  place: 'Enter some text',
  name: 'some-name',
  max: 30,
  size: 30,
  tab: 5
};

const staticCheckboxContext = {
  tab: 6,
  name: 'hello',
  val: false
};
const staticCheckboxTemplate = '{{input type="checkbox" disabled=true tabindex=6 name="hello" checked=false}}';

moduleFor('Helpers test: {{input}}', class extends InputRenderingTest {

  ['@htmlbars should insert a text field into DOM']() {
    this.render(defaultTemplate, defaultContext);

    equal(this.$('input').length, 1);

    this.assertStableRerender();

    equal(this.$('input').length, 1);
  }

  ['@htmlbars should become disabled if the disabled attribute is true']() {
    this.render(defaultTemplate, defaultContext);

    ok(this.$('input').is(':not(:disabled)'), 'There are no disabled text fields');

    this.runTask(() => set(this.context, 'disabled', true));
    ok(this.$('input').is(':disabled'), 'The text field is disabled');

    this.runTask(() => set(this.context, 'disabled', false));
    ok(this.$('input').is(':not(:disabled)'), 'There are no disabled text fields');

    this.assertStableRerender();

    ok(this.$('input').is(':not(:disabled)'), 'There are no disabled text fields');
  }

  ['@htmlbars input value is updated when setting value property of view']() {
    this.render(defaultTemplate, defaultContext);

    equal(this.$('input').val(), 'hello', 'renders text field with value');

    let id = this.$('input').prop('id');

    this.runTask(() => set(this.context, 'val', 'bye!'));
    equal(this.$('input').val(), 'bye!', 'updates text field after value changes');

    equal(this.$('input').prop('id'), id, 'the component hasn\'t changed');

    this.assertStableRerender();

    equal(this.$('input').val(), 'bye!', 'updates text field after value changes');

    equal(this.$('input').prop('id'), id, 'the component hasn\'t changed');
  }

  ['@htmlbars input placeholder is updated when setting placeholder property of view']() {
    this.render(defaultTemplate, defaultContext);

    equal(this.$('input').attr('placeholder'), 'Enter some text', 'renders text field with placeholder');
    this.runTask(() => set(this.context, 'place', 'Text, please enter it'));
    equal(this.$('input').attr('placeholder'), 'Text, please enter it', 'updates text field after placeholder changes');

    this.assertStableRerender();

    equal(this.$('input').attr('placeholder'), 'Text, please enter it', 'updates text field after placeholder changes');
  }

  ['@htmlbars input name is updated when setting name property of view']() {
    this.render(defaultTemplate, defaultContext);

    equal(this.$('input').attr('name'), 'some-name', 'renders text field with name');
    this.runTask(() => set(this.context, 'name', 'other-name'));
    equal(this.$('input').attr('name'), 'other-name', 'updates text field after name changes');

    this.assertStableRerender();

    equal(this.$('input').attr('name'), 'other-name', 'updates text field after name changes');
  }

  ['@htmlbars input maxlength is updated when setting maxlength property of view']() {
    this.render(defaultTemplate, defaultContext);
    equal(this.$('input').attr('maxlength'), '30', 'renders text field with maxlength');
    this.runTask(() => set(this.context, 'max', 40));
    equal(this.$('input').attr('maxlength'), '40', 'updates text field after maxlength changes');

    this.assertStableRerender();

    equal(this.$('input').attr('maxlength'), '40', 'updates text field after maxlength changes');
  }

  ['@htmlbars input size is updated when setting size property of view']() {
    this.render(defaultTemplate, defaultContext);
    equal(this.$('input').attr('size'), '30', 'renders text field with size');
    this.runTask(() => set(this.context, 'size', 40));
    equal(this.$('input').attr('size'), '40', 'updates text field after size changes');

    this.assertStableRerender();

    equal(this.$('input').attr('size'), '40', 'updates text field after size changes');
  }

  ['@htmlbars input tabindex is updated when setting tabindex property of view']() {
    this.render(defaultTemplate, defaultContext);
    equal(this.$('input').attr('tabindex'), '5', 'renders text field with the tabindex');
    this.runTask(() => set(this.context, 'tab', 3));
    equal(this.$('input').attr('tabindex'), '3', 'updates text field after tabindex changes');

    this.assertStableRerender();

    equal(this.$('input').attr('tabindex'), '3', 'updates text field after tabindex changes');
  }

  ['@htmlbars cursor position is not lost when updating content']() {
    this.render(defaultTemplate, defaultContext);
    equal(this.$('input').val(), 'hello', 'precondition - renders text field with value');

    var $input = this.$('input');
    var input = $input[0];

    // set the cursor position to 3 (no selection)
    this.runTask(() => {
      input.value = 'derp';
      input.selectionStart = 3;
      input.selectionEnd = 3;
    });
    this.runTask(() => set(this.context, 'val', 'derp'));

    equal(this.$('input').val(), 'derp', 'updates text field after value changes');

    equal(input.selectionStart, 3, 'cursor position was not lost');
    equal(input.selectionEnd, 3, 'cursor position was not lost');

    this.assertStableRerender();

    equal(this.$('input').val(), 'derp', 'updates text field after value changes');

    equal(input.selectionStart, 3, 'cursor position was not lost');
    equal(input.selectionEnd, 3, 'cursor position was not lost');
  }

  ['@htmlbars input can be updated multiple times']() {
    this.render(defaultTemplate, defaultContext);
    equal(this.$('input').val(), 'hello', 'precondition - renders text field with value');

    var $input = this.$('input');
    var input = $input[0];

    this.runTask(() => set(this.context, 'val', ''));
    equal(this.$('input').val(), '', 'updates first time');

    // Simulates setting the input to the same value as it already is which won't cause a rerender
    this.runTask(() => {
      input.value = 'derp';
    });
    this.runTask(() => set(this.context, 'val', 'derp'));
    equal(this.$('input').val(), 'derp', 'updates second time');

    this.runTask(() => set(this.context, 'val', ''));
    equal(this.$('input').val(), '', 'updates third time');

    this.assertStableRerender();

    equal(this.$('input').val(), '', 'updates third time');
  }

  ['@htmlbars should insert a text field into DOM for static value']() {
    this.render(staticTemplate, {});
    equal(this.$('input').length, 1, 'A single text field was inserted');

    this.assertStableRerender();

    equal(this.$('input').length, 1, 'A single text field was inserted');
  }

  ['@htmlbars should become disabled if the disabled attribute is true for static value']() {
    this.render(staticTemplate, {});
    ok(this.$('input').is(':disabled'), 'The text field is disabled');

    this.assertStableRerender();

    ok(this.$('input').is(':disabled'), 'The text field is disabled');
  }

  ['@htmlbars input value is updated when setting value property of view for static value']() {
    this.render(staticTemplate, {});
    equal(this.$('input').val(), 'hello', 'renders text field with value');

    this.assertStableRerender();

    equal(this.$('input').val(), 'hello', 'renders text field with value');
  }

  ['@htmlbars input placeholder is updated when setting placeholder property of view for static value']() {
    this.render(staticTemplate, {});
    equal(this.$('input').attr('placeholder'), 'Enter some text', 'renders text field with placeholder');

    this.assertStableRerender();

    equal(this.$('input').attr('placeholder'), 'Enter some text', 'renders text field with placeholder');
  }

  ['@htmlbars input name is updated when setting name property of view for static value']() {
    this.render(staticTemplate, {});
    equal(this.$('input').attr('name'), 'some-name', 'renders text field with name');

    this.assertStableRerender();

    equal(this.$('input').attr('name'), 'some-name', 'renders text field with name');
  }

  ['@htmlbars input maxlength is updated when setting maxlength property of view for static value']() {
    this.render(staticTemplate, {});
    equal(this.$('input').attr('maxlength'), '30', 'renders text field with maxlength');

    this.assertStableRerender();

    equal(this.$('input').attr('maxlength'), '30', 'renders text field with maxlength');
  }

  ['@htmlbars input size is updated when setting size property of view for static value']() {
    this.render(staticTemplate, {});
    equal(this.$('input').attr('size'), '30', 'renders text field with size');

    this.assertStableRerender();

    equal(this.$('input').attr('size'), '30', 'renders text field with size');
  }

  ['@htmlbars input tabindex is updated when setting tabindex property of view for static value']() {
    this.render(staticTemplate, {});
    equal(this.$('input').attr('tabindex'), '5', 'renders text field with the tabindex');

    this.assertStableRerender();

    equal(this.$('input').attr('tabindex'), '5', 'renders text field with the tabindex');
  }

  ['@htmlbars specifying `on="someevent" action="foo"` triggers the action']() {
    expect(2);

    expectDeprecation(() => {
      this.registerComponent('my-action-component', {
        ComponentClass: Component.extend({
          actions: {
            doFoo() {
              ok(true, 'text field sent correct action');
            }
          }
        }),
        template: `{{input type="text" on="focus-in" action="doFoo"}}`
      });


      this.render('{{my-action-component}}');
    }, `Using '{{input on="focus-in" action="doFoo"}}' ('components/my-action-component' @ L1:C0) is deprecated. Please use '{{input focus-in="doFoo"}}' instead.`);

    this.runTask(() => {
      var textField = this.$('input');
      textField.trigger('focusin');
    });
  }

  ['@htmlbars should insert a text field into DOM with dynamic type']() {
    this.render('{{input type=someProperty}}', {
      someProperty: 'password'
    });
    equal(this.$('input').attr('type'), 'password', 'a bound property can be used to determine type.');

    this.assertStableRerender();

    equal(this.$('input').attr('type'), 'password', 'a bound property can be used to determine type.');
  }

  ['@htmlbars should change if the type changes']() {
    this.render('{{input type=someProperty}}', {
      someProperty: 'password'
    });
    equal(this.$('input').attr('type'), 'password', 'a bound property can be used to determine type.');

    this.runTask(() => set(this.context, 'someProperty', 'text'));
    equal(this.$('input').attr('type'), 'text', 'it changes after the type changes');

    this.assertStableRerender();

    equal(this.$('input').attr('type'), 'text', 'it changes after the type changes');
  }

  ['@htmlbars should have the default type']() {
    this.render('{{input}}', {});
    equal(this.$('input').attr('type'), 'text', 'Has a default text type');

    this.assertStableRerender();

    equal(this.$('input').attr('type'), 'text', 'Has a default text type');
  }

  ['@htmlbars should append a checkbox']() {
    this.render(checkboxTemplate, checkboxContext);
    equal(this.$('input[type=checkbox]').length, 1, 'A single checkbox is added');

    this.assertStableRerender();

    equal(this.$('input[type=checkbox]').length, 1, 'A single checkbox is added');
  }

  ['@htmlbars should begin disabled if the disabled attribute is true']() {
    this.render(checkboxTemplate, checkboxContext);
    ok(this.$('input').is(':not(:disabled)'), 'The checkbox isn\'t disabled');
    this.runTask(() => set(this.context, 'disabled', true));
    ok(this.$('input').is(':disabled'), 'The checkbox is now disabled');

    this.assertStableRerender();

    ok(this.$('input').is(':disabled'), 'The checkbox is now disabled');
  }

  ['@htmlbars should support the tabindex property']() {
    this.render(checkboxTemplate, checkboxContext);
    equal(this.$('input').prop('tabindex'), '6', 'the initial checkbox tabindex is set in the DOM');
    this.runTask(() => set(this.context, 'tab', 3));
    equal(this.$('input').prop('tabindex'), '3', 'the checkbox tabindex changes when it is changed in the view');

    this.assertStableRerender();

    equal(this.$('input').prop('tabindex'), '3', 'the checkbox tabindex changes when it is changed in the view');
  }

  ['@htmlbars checkbox name is updated']() {
    this.render(checkboxTemplate, checkboxContext);
    equal(this.$('input').attr('name'), 'hello', 'renders checkbox with the name');
    this.runTask(() => set(this.context, 'name', 'bye'));
    equal(this.$('input').attr('name'), 'bye', 'updates checkbox after name changes');

    this.assertStableRerender();

    equal(this.$('input').attr('name'), 'bye', 'updates checkbox after name changes');
  }

  ['@htmlbars checkbox checked property is updated']() {
    this.render(checkboxTemplate, checkboxContext);
    equal(this.$('input').prop('checked'), false, 'the checkbox isn\'t checked yet');
    this.runTask(() => set(this.context, 'val', true));
    equal(this.$('input').prop('checked'), true, 'the checkbox is checked now');

    this.assertStableRerender();

    equal(this.$('input').prop('checked'), true, 'the checkbox is checked now');
  }

  ['@htmlbars It asserts the presence of checked=']() {
    expectAssertion(() => {
      this.render('{{input type="checkbox" disabled=disabled tabindex=tab name=name value=val}}', {
        val: 'hello',
        place: 'Enter some text',
        name: 'some-name',
        max: 30,
        size: 30,
        tab: 5
      });
    }, /you must use `checked=/);
  }

  ['@htmlbars should append a checkbox with bound type']() {
    this.render('{{input type=inputType checked=isChecked}}', {
      inputType: 'checkbox',
      isChecked: true
    });
    equal(this.$('input[type=checkbox]').length, 1, 'A single checkbox is added');

    this.assertStableRerender();

    equal(this.$('input[type=checkbox]').length, 1, 'A single checkbox is added');
  }

  // Checking for the checked property is a good way to verify that the correct
  // view was used.
  ['@htmlbars checkbox checked property is updated with bound type']() {
    this.render('{{input type=inputType checked=isChecked}}', {
      inputType: 'checkbox',
      isChecked: true
    });
    equal(this.$('input').prop('checked'), true, 'the checkbox is checked');

    this.assertStableRerender();

    equal(this.$('input').prop('checked'), true, 'the checkbox is checked');
  }

  ['@htmlbars static checkbox should begin disabled if the disabled attribute is true']() {
    this.render(staticCheckboxTemplate, staticCheckboxContext);
    ok(this.$().is(':not(:disabled)'), 'The checkbox isn\'t disabled');

    this.assertStableRerender();

    ok(this.$().is(':not(:disabled)'), 'The checkbox isn\'t disabled');
  }

  ['@htmlbars static checkbox should support the tabindex property']() {
    this.render(staticCheckboxTemplate, staticCheckboxContext);
    equal(this.$('input').prop('tabindex'), '6', 'the initial checkbox tabindex is set in the DOM');

    this.assertStableRerender();

    equal(this.$('input').prop('tabindex'), '6', 'the initial checkbox tabindex is set in the DOM');
  }

  ['@htmlbars static checkbox checkbox name is updated']() {
    this.render(staticCheckboxTemplate, staticCheckboxContext);
    equal(this.$('input').attr('name'), 'hello', 'renders checkbox with the name');

    this.assertStableRerender();

    equal(this.$('input').attr('name'), 'hello', 'renders checkbox with the name');
  }

  ['@htmlbars static checkbox checkbox checked property is updated']() {
    this.render(staticCheckboxTemplate, staticCheckboxContext);
    equal(this.$('input').prop('checked'), false, 'the checkbox isn\'t checked yet');

    this.assertStableRerender();

    equal(this.$('input').prop('checked'), false, 'the checkbox isn\'t checked yet');
  }

  ['@htmlbars placeholder attribute bound to undefined is not present']() {
    this.render('{{input placeholder=someThingNotThere}}', {});

    ok(!this.$('input')[0].hasAttribute('placeholder'), 'attribute not present');

    this.runTask(() => set(this.context, 'someThingNotThere', 'foo'));

    equal(this.$('input')[0].getAttribute('placeholder'), 'foo', 'attribute is present');

    this.assertStableRerender();

    equal(this.$('input')[0].getAttribute('placeholder'), 'foo', 'attribute is present');
  }

  ['@htmlbars placeholder attribute bound to null is not present']() {
    this.render('{{input placeholder=someThingNotThere}}', {
      someThingNotThere: null
    });

    ok(!this.$('input')[0].hasAttribute('placeholder'), 'attribute not present');

    this.runTask(() => set(this.context, 'someThingNotThere', 'foo'));

    equal(this.$('input')[0].getAttribute('placeholder'), 'foo', 'attribute is present');

    this.assertStableRerender();

    equal(this.$('input')[0].getAttribute('placeholder'), 'foo', 'attribute is present');
  }
});
