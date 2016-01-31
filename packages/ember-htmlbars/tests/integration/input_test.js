import run from 'ember-metal/run_loop';
import { set } from 'ember-metal/property_set';
import View from 'ember-views/views/view';
import { runAppend, runDestroy } from 'ember-runtime/tests/utils';
import compile from 'ember-template-compiler/system/compile';
import ComponentLookup from 'ember-views/component_lookup';
import TextField from 'ember-views/views/text_field';
import Checkbox from 'ember-views/views/checkbox';
import EventDispatcher from 'ember-views/system/event_dispatcher';
import buildOwner from 'container/tests/test-helpers/build-owner';
import { OWNER } from 'container/owner';

let view, controller, owner, $input, input;

function commonSetup() {
  owner = buildOwner();
  owner.register('component:-text-field', TextField);
  owner.register('component:-checkbox', Checkbox);
  owner.register('component-lookup:main', ComponentLookup);
  owner.register('event_dispatcher:main', EventDispatcher);

  let dispatcher = owner.lookup('event_dispatcher:main');
  dispatcher.setup({}, '#qunit-fixture');
}

QUnit.module('<input>', {
  setup() {
    commonSetup();

    controller = {
      value: 'hello',
      placeholder: 'Enter some text',
      name: 'some-name',
      max: 30,
      size: 30,
      tab: 5
    };

    view = View.extend({
      [OWNER]: owner,
      controller,
      template: compile(`<input value={{value}}
                                disabled={{disabled}}
                                placeholder={{placeholder}}
                                name={{name}}
                                maxlength={{max}}
                                size={{size}}
                                tabindex={{tab}}>`)
    }).create();

    runAppend(view);

    $input = view.$('input');
    input = $input[0];
  },

  teardown() {
    runDestroy(view);
    runDestroy(owner);
  }
});

QUnit.test('should insert a text field into DOM', function(assert) {
  assert.equal($input.length, 1, 'A single text field was inserted');
});

QUnit.test('should become disabled if the disabled attribute is true', function(assert) {
  assert.ok($input.is(':not(:disabled)'), 'There are no disabled text fields');

  run(_ => set(controller, 'disabled', true));

  assert.ok($input.is(':disabled'), 'The text field is disabled');

  run(_ => set(controller, 'disabled', false));

  assert.ok($input.is(':not(:disabled)'), 'There are no disabled text fields');
});

QUnit.test('input value is updated when setting value property of view', function(assert) {
  assert.equal($input.val(), 'hello', 'renders text field with value');

  let id = $input.prop('id');

  run(_ => set(controller, 'value', 'bye!'));

  assert.equal($input.val(), 'bye!', 'updates text field after value changes');
  assert.equal($input.prop('id'), id, 'the component hasn\'t changed');
});

QUnit.test('input placeholder is updated when setting placeholder property of view', function(assert) {
  assert.equal($input.attr('placeholder'), 'Enter some text', 'renders text field with placeholder');

  run(_ => set(controller, 'placeholder', 'Text, please enter it'));

  assert.equal($input.attr('placeholder'), 'Text, please enter it', 'updates text field after placeholder changes');
});

QUnit.test('input name is updated when setting name property of view', function(assert) {
  assert.equal($input.attr('name'), 'some-name', 'renders text field with name');

  run(_ => set(controller, 'name', 'other-name'));

  assert.equal($input.attr('name'), 'other-name', 'updates text field after name changes');
});

QUnit.test('input maxlength is updated when setting maxlength property of view', function(assert) {
  assert.equal($input.attr('maxlength'), '30', 'renders text field with maxlength');

  run(_ => set(controller, 'max', 40));

  assert.equal($input.attr('maxlength'), '40', 'updates text field after maxlength changes');
});

QUnit.test('input size is updated when setting size property of view', function(assert) {
  assert.equal($input.attr('size'), '30', 'renders text field with size');

  run(_ => set(controller, 'size', 40));

  assert.equal($input.attr('size'), '40', 'updates text field after size changes');
});

QUnit.test('input tabindex is updated when setting tabindex property of view', function(assert) {
  assert.equal($input.attr('tabindex'), '5', 'renders text field with the tabindex');

  run(_ => set(controller, 'tab', 3));

  assert.equal($input.attr('tabindex'), '3', 'updates text field after tabindex changes');
});

QUnit.test('cursor position is not lost when updating content', function(assert) {
  run(_ => {
    // Since we can't simulate an actual keypress we can not do a proper integration test.
    // Instead, we will simulate the underlying issue caused by the keypress by
    // desyncing the attr morph's last know value from the DOM and re-setting the
    // controller's value to the input's current value.

    input.value = 'hola';
    input.selectionStart = 1;
    input.selectionEnd = 3;

    set(controller, 'value', 'hola');
  });

  assert.equal(input.selectionStart, 1, 'cursor position was not lost');
  assert.equal(input.selectionEnd, 3, 'cursor position was not lost');
});

QUnit.test('input can be updated multiple times', function(assert) {
  assert.equal($input.val(), 'hello', 'precondition - renders text field with value');

  run(_ => set(controller, 'value', ''));
  assert.equal($input.val(), '', 'updates first time');

  // Simulates setting the input to the same value as it already is which won't cause a rerender
  run(_ => input.value = 'derp');
  run(_ => set(controller, 'value', 'derp'));
  assert.equal($input.val(), 'derp', 'updates second time');

  run(_ => set(controller, 'value', ''));
  assert.equal($input.val(), '', 'updates third time');
});
