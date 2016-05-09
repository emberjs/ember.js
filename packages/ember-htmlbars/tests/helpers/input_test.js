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
import { test, testModule } from 'ember-glimmer/tests/utils/skip-if-glimmer';

var view;
var controller, owner;

function commonSetup() {
  owner = buildOwner();
  owner.register('component:-text-field', TextField);
  owner.register('component:-checkbox', Checkbox);
  owner.register('component-lookup:main', ComponentLookup);
  owner.register('event_dispatcher:main', EventDispatcher);

  var dispatcher = owner.lookup('event_dispatcher:main');
  dispatcher.setup({}, '#qunit-fixture');
}

testModule('{{input type=\'text\'}}', {
  setup() {
    commonSetup();

    controller = {
      val: 'hello',
      place: 'Enter some text',
      name: 'some-name',
      max: 30,
      size: 30,
      tab: 5
    };

    view = View.extend({
      [OWNER]: owner,
      controller,
      template: compile('{{input type="text" disabled=disabled value=val placeholder=place name=name maxlength=max size=size tabindex=tab}}')
    }).create();

    runAppend(view);
  },

  teardown() {
    runDestroy(view);
    runDestroy(owner);
  }
});

test('should insert a text field into DOM', function() {
  equal(view.$('input').length, 1, 'A single text field was inserted');
});

test('should become disabled if the disabled attribute is true', function() {
  ok(view.$('input').is(':not(:disabled)'), 'There are no disabled text fields');

  run(null, set, controller, 'disabled', true);
  ok(view.$('input').is(':disabled'), 'The text field is disabled');

  run(null, set, controller, 'disabled', false);
  ok(view.$('input').is(':not(:disabled)'), 'There are no disabled text fields');
});

test('input value is updated when setting value property of view', function() {
  equal(view.$('input').val(), 'hello', 'renders text field with value');

  let id = view.$('input').prop('id');

  run(null, set, controller, 'val', 'bye!');
  equal(view.$('input').val(), 'bye!', 'updates text field after value changes');

  equal(view.$('input').prop('id'), id, 'the component hasn\'t changed');
});

test('input placeholder is updated when setting placeholder property of view', function() {
  equal(view.$('input').attr('placeholder'), 'Enter some text', 'renders text field with placeholder');
  run(null, set, controller, 'place', 'Text, please enter it');
  equal(view.$('input').attr('placeholder'), 'Text, please enter it', 'updates text field after placeholder changes');
});

test('input name is updated when setting name property of view', function() {
  equal(view.$('input').attr('name'), 'some-name', 'renders text field with name');
  run(null, set, controller, 'name', 'other-name');
  equal(view.$('input').attr('name'), 'other-name', 'updates text field after name changes');
});

test('input maxlength is updated when setting maxlength property of view', function() {
  equal(view.$('input').attr('maxlength'), '30', 'renders text field with maxlength');
  run(null, set, controller, 'max', 40);
  equal(view.$('input').attr('maxlength'), '40', 'updates text field after maxlength changes');
});

test('input size is updated when setting size property of view', function() {
  equal(view.$('input').attr('size'), '30', 'renders text field with size');
  run(null, set, controller, 'size', 40);
  equal(view.$('input').attr('size'), '40', 'updates text field after size changes');
});

test('input tabindex is updated when setting tabindex property of view', function() {
  equal(view.$('input').attr('tabindex'), '5', 'renders text field with the tabindex');
  run(null, set, controller, 'tab', 3);
  equal(view.$('input').attr('tabindex'), '3', 'updates text field after tabindex changes');
});

test('cursor position is not lost when updating content', function() {
  equal(view.$('input').val(), 'hello', 'precondition - renders text field with value');

  var $input = view.$('input');
  var input = $input[0];

  // set the cursor position to 3 (no selection)
  run(function() {
    input.value = 'derp';
    view.childViews[0]._elementValueDidChange();
    input.selectionStart = 3;
    input.selectionEnd = 3;
  });
  run(null, set, controller, 'val', 'derp');

  equal(view.$('input').val(), 'derp', 'updates text field after value changes');

  equal(input.selectionStart, 3, 'cursor position was not lost');
  equal(input.selectionEnd, 3, 'cursor position was not lost');
});

test('input can be updated multiple times', function() {
  equal(view.$('input').val(), 'hello', 'precondition - renders text field with value');

  var $input = view.$('input');
  var input = $input[0];

  run(null, set, controller, 'val', '');
  equal(view.$('input').val(), '', 'updates first time');

  // Simulates setting the input to the same value as it already is which won't cause a rerender
  run(function() {
    input.value = 'derp';
  });
  run(null, set, controller, 'val', 'derp');
  equal(view.$('input').val(), 'derp', 'updates second time');

  run(null, set, controller, 'val', '');
  equal(view.$('input').val(), '', 'updates third time');
});


testModule('{{input type=\'text\'}} - static values', {
  setup() {
    commonSetup();

    controller = {};

    view = View.extend({
      [OWNER]: owner,
      controller: controller,
      template: compile('{{input type="text" disabled=true value="hello" placeholder="Enter some text" name="some-name" maxlength=30 size=30 tabindex=5}}')
    }).create();

    runAppend(view);
  },

  teardown() {
    runDestroy(view);
    runDestroy(owner);
  }
});

test('should insert a text field into DOM', function() {
  equal(view.$('input').length, 1, 'A single text field was inserted');
});

test('should become disabled if the disabled attribute is true', function() {
  ok(view.$('input').is(':disabled'), 'The text field is disabled');
});

test('input value is updated when setting value property of view', function() {
  equal(view.$('input').val(), 'hello', 'renders text field with value');
});

test('input placeholder is updated when setting placeholder property of view', function() {
  equal(view.$('input').attr('placeholder'), 'Enter some text', 'renders text field with placeholder');
});

test('input name is updated when setting name property of view', function() {
  equal(view.$('input').attr('name'), 'some-name', 'renders text field with name');
});

test('input maxlength is updated when setting maxlength property of view', function() {
  equal(view.$('input').attr('maxlength'), '30', 'renders text field with maxlength');
});

test('input size is updated when setting size property of view', function() {
  equal(view.$('input').attr('size'), '30', 'renders text field with size');
});

test('input tabindex is updated when setting tabindex property of view', function() {
  equal(view.$('input').attr('tabindex'), '5', 'renders text field with the tabindex');
});

test('specifying `on="someevent" action="foo"` triggers the action', function() {
  expect(2);
  runDestroy(view);
  expectDeprecation(`Using '{{input on="focus-in" action="doFoo"}}' ('foo.hbs' @ L1:C0) is deprecated. Please use '{{input focus-in="doFoo"}}' instead.`);

  controller = {
    send(actionName, value, sender) {
      equal(actionName, 'doFoo', 'text field sent correct action name');
    }
  };

  view = View.create({
    [OWNER]: owner,
    controller,
    template: compile('{{input type="text" on="focus-in" action="doFoo"}}', { moduleName: 'foo.hbs' })
  });

  runAppend(view);

  run(function() {
    var textField = view.$('input');
    textField.trigger('focusin');
  });
});

testModule('{{input type=\'text\'}} - dynamic type', {
  setup() {
    commonSetup();

    controller = {
      someProperty: 'password'
    };

    view = View.extend({
      [OWNER]: owner,
      controller,
      template: compile('{{input type=someProperty}}')
    }).create();

    runAppend(view);
  },

  teardown() {
    runDestroy(view);
    runDestroy(owner);
  }
});

test('should insert a text field into DOM', function() {
  equal(view.$('input').attr('type'), 'password', 'a bound property can be used to determine type.');
});

test('should change if the type changes', function() {
  equal(view.$('input').attr('type'), 'password', 'a bound property can be used to determine type.');

  run(function() {
    set(controller, 'someProperty', 'text');
  });

  equal(view.$('input').attr('type'), 'text', 'it changes after the type changes');
});

testModule('{{input}} - default type', {
  setup() {
    commonSetup();

    controller = {};

    view = View.extend({
      [OWNER]: owner,
      controller,
      template: compile('{{input}}')
    }).create();

    runAppend(view);
  },

  teardown() {
    runDestroy(view);
    runDestroy(owner);
  }
});

test('should have the default type', function() {
  equal(view.$('input').attr('type'), 'text', 'Has a default text type');
});

testModule('{{input type=\'checkbox\'}}', {
  setup() {
    commonSetup();

    controller = {
      tab: 6,
      name: 'hello',
      val: false
    };

    view = View.extend({
      [OWNER]: owner,
      controller,
      template: compile('{{input type="checkbox" disabled=disabled tabindex=tab name=name checked=val}}')
    }).create();

    runAppend(view);
  },

  teardown() {
    runDestroy(view);
    runDestroy(owner);
  }
});

test('should append a checkbox', function() {
  equal(view.$('input[type=checkbox]').length, 1, 'A single checkbox is added');
});

test('should begin disabled if the disabled attribute is true', function() {
  ok(view.$('input').is(':not(:disabled)'), 'The checkbox isn\'t disabled');
  run(null, set, controller, 'disabled', true);
  ok(view.$('input').is(':disabled'), 'The checkbox is now disabled');
});

test('should support the tabindex property', function() {
  equal(view.$('input').prop('tabindex'), '6', 'the initial checkbox tabindex is set in the DOM');
  run(null, set, controller, 'tab', 3);
  equal(view.$('input').prop('tabindex'), '3', 'the checkbox tabindex changes when it is changed in the view');
});

test('checkbox name is updated', function() {
  equal(view.$('input').attr('name'), 'hello', 'renders checkbox with the name');
  run(null, set, controller, 'name', 'bye');
  equal(view.$('input').attr('name'), 'bye', 'updates checkbox after name changes');
});

test('checkbox checked property is updated', function() {
  equal(view.$('input').prop('checked'), false, 'the checkbox isn\'t checked yet');
  run(null, set, controller, 'val', true);
  equal(view.$('input').prop('checked'), true, 'the checkbox is checked now');
});

testModule('{{input type=\'checkbox\'}} - prevent value= usage', {
  setup() {
    commonSetup();

    view = View.extend({
      [OWNER]: owner,
      controller,
      template: compile('{{input type="checkbox" disabled=disabled tabindex=tab name=name value=val}}')
    }).create();
  },

  teardown() {
    runDestroy(view);
    runDestroy(owner);
  }
});

test('It asserts the presence of checked=', function() {
  expectAssertion(function() {
    runAppend(view);
  }, /you must use `checked=/);
});

testModule('{{input type=boundType}}', {
  setup() {
    commonSetup();

    controller = {
      inputType: 'checkbox',
      isChecked: true
    };

    view = View.extend({
      [OWNER]: owner,
      controller,
      template: compile('{{input type=inputType checked=isChecked}}')
    }).create();

    runAppend(view);
  },

  teardown() {
    runDestroy(view);
    runDestroy(owner);
  }
});

test('should append a checkbox', function() {
  equal(view.$('input[type=checkbox]').length, 1, 'A single checkbox is added');
});

// Checking for the checked property is a good way to verify that the correct
// view was used.
test('checkbox checked property is updated', function() {
  equal(view.$('input').prop('checked'), true, 'the checkbox is checked');
});

testModule('{{input type=\'checkbox\'}} - static values', {
  setup() {
    commonSetup();

    controller = {
      tab: 6,
      name: 'hello',
      val: false
    };

    view = View.extend({
      [OWNER]: owner,
      controller,
      template: compile('{{input type="checkbox" disabled=true tabindex=6 name="hello" checked=false}}')
    }).create();

    runAppend(view);
  },

  teardown() {
    runDestroy(view);
    runDestroy(owner);
  }
});

test('should begin disabled if the disabled attribute is true', function() {
  ok(view.$().is(':not(:disabled)'), 'The checkbox isn\'t disabled');
});

test('should support the tabindex property', function() {
  equal(view.$('input').prop('tabindex'), '6', 'the initial checkbox tabindex is set in the DOM');
});

test('checkbox name is updated', function() {
  equal(view.$('input').attr('name'), 'hello', 'renders checkbox with the name');
});

test('checkbox checked property is updated', function() {
  equal(view.$('input').prop('checked'), false, 'the checkbox isn\'t checked yet');
});

testModule('{{input type=\'text\'}} - null/undefined values', {
  setup() {
    commonSetup();
  },

  teardown() {
    runDestroy(view);
    runDestroy(owner);
  }
});

test('placeholder attribute bound to undefined is not present', function() {
  view = View.extend({
    [OWNER]: owner,
    controller: {},
    template: compile('{{input placeholder=someThingNotThere}}')
  }).create();

  runAppend(view);

  ok(!view.element.childNodes[1].hasAttribute('placeholder'), 'attribute not present');

  run(null, set, view, 'controller.someThingNotThere', 'foo');

  equal(view.element.childNodes[1].getAttribute('placeholder'), 'foo', 'attribute is present');
});

test('placeholder attribute bound to null is not present', function() {
  view = View.extend({
    [OWNER]: owner,
    controller: {
      someNullProperty: null
    },
    template: compile('{{input placeholder=someNullProperty}}')
  }).create();

  runAppend(view);

  ok(!view.element.childNodes[1].hasAttribute('placeholder'), 'attribute not present');

  run(null, set, view, 'controller.someNullProperty', 'foo');

  equal(view.element.childNodes[1].getAttribute('placeholder'), 'foo', 'attribute is present');
});
