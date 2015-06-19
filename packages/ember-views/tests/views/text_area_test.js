import EmberObject from "ember-runtime/system/object";
import { forEach } from "ember-metal/array";
import run from "ember-metal/run_loop";
import TextArea from "ember-views/views/text_area";
import { get } from "ember-metal/property_get";
import { set as o_set } from "ember-metal/property_set";

var textArea, TestObject;

function set(object, key, value) {
  run(function() { o_set(object, key, value); });
}

function append() {
  run(function() {
    textArea.appendTo('#qunit-fixture');
  });
}

QUnit.module("TextArea", {
  setup() {
    TestObject = window.TestObject = EmberObject.create({
      value: null
    });

    textArea = TextArea.create();
  },

  teardown() {
    run(function() {
      textArea.destroy();
    });

    TestObject = window.TestObject = textArea = null;
  }
});

QUnit.test("should become disabled if the disabled attribute is true", function() {
  textArea.set('disabled', true);
  append();

  ok(textArea.$().is(":disabled"));
});

QUnit.test("should become disabled if the disabled attribute is true", function() {
  append();
  ok(textArea.$().is(":not(:disabled)"));

  run(function() { textArea.set('disabled', true); });
  ok(textArea.$().is(":disabled"));

  run(function() { textArea.set('disabled', false); });
  ok(textArea.$().is(":not(:disabled)"));
});

QUnit.test("input value is updated when setting value property of view", function() {
  run(function() {
    set(textArea, 'value', 'foo');
    textArea.append();
  });

  equal(textArea.$().val(), "foo", "renders text field with value");

  run(function() { set(textArea, 'value', 'bar'); });

  equal(textArea.$().val(), "bar", "updates text field after value changes");
});

QUnit.test("input placeholder is updated when setting placeholder property of view", function() {
  run(function() {
    set(textArea, 'placeholder', 'foo');
    textArea.append();
  });

  equal(textArea.$().attr('placeholder'), "foo", "renders text area with placeholder");

  run(function() { set(textArea, 'placeholder', 'bar'); });

  equal(textArea.$().attr('placeholder'), "bar", "updates text area after placeholder changes");
});

QUnit.test("input name is updated when setting name property of view", function() {
  run(function() {
    set(textArea, 'name', 'foo');
    textArea.append();
  });

  equal(textArea.$().attr('name'), "foo", "renders text area with name");

  run(function() { set(textArea, 'name', 'bar'); });

  equal(textArea.$().attr('name'), "bar", "updates text area after name changes");
});

QUnit.test("input maxlength is updated when setting maxlength property of view", function() {
  run(function() {
    set(textArea, 'maxlength', '300');
    textArea.append();
  });

  equal(textArea.$().attr('maxlength'), "300", "renders text area with maxlength");

  run(function() { set(textArea, 'maxlength', '400'); });

  equal(textArea.$().attr('maxlength'), "400", "updates text area after maxlength changes");
});

QUnit.test("input rows is updated when setting rows property of view", function() {
  run(function() {
    set(textArea, 'rows', '3');
    textArea.append();
  });

  equal(textArea.$().attr('rows'), "3", "renders text area with rows");

  run(function() { set(textArea, 'rows', '4'); });

  equal(textArea.$().attr('rows'), "4", "updates text area after rows changes");
});

QUnit.test("input cols is updated when setting cols property of view", function() {
  run(function() {
    set(textArea, 'cols', '30');
    textArea.append();
  });

  equal(textArea.$().attr('cols'), "30", "renders text area with cols");

  run(function() { set(textArea, 'cols', '40'); });

  equal(textArea.$().attr('cols'), "40", "updates text area after cols changes");
});

QUnit.test("input tabindex is updated when setting tabindex property of view", function() {
  run(function() {
    set(textArea, 'tabindex', '4');
    textArea.append();
  });

  equal(textArea.$().attr('tabindex'), "4", "renders text area with the tabindex");

  run(function() { set(textArea, 'tabindex', '1'); });

  equal(textArea.$().attr('tabindex'), "1", "updates text area after tabindex changes");
});

QUnit.test("input title is updated when setting title property of view", function() {
  run(function() {
    set(textArea, 'title', 'FooTitle');
    textArea.append();
  });
  equal(textArea.$().attr('title'), "FooTitle", "renders text area with the title");

  run(function() { set(textArea, 'title', 'BarTitle'); });
  equal(textArea.$().attr('title'), 'BarTitle', "updates text area after title changes");
});

QUnit.test("value binding works properly for inputs that haven't been created", function() {
  run(function() {
    textArea.destroy(); // destroy existing textarea
    textArea = TextArea.create({
      valueBinding: 'TestObject.value'
    });
  });

  equal(get(textArea, 'value'), null, "precond - default value is null");
  equal(textArea.$(), undefined, "precond - view doesn't have its layer created yet, thus no input element");

  run(function() {
    set(TestObject, 'value', 'ohai');
  });

  equal(get(textArea, 'value'), 'ohai', "value property was properly updated");

  run(function() { textArea.append(); });

  equal(get(textArea, 'value'), 'ohai', "value property remains the same once the view has been appended");
  equal(textArea.$().val(), 'ohai', "value is reflected in the input element once it is created");
});

forEach.call(['cut', 'paste', 'input'], function(eventName) {
  QUnit.test("should update the value on " + eventName + " events", function() {

    run(function() {
      textArea.append();
    });

    textArea.$().val('new value');
    run(function() {
      textArea.trigger(eventName, EmberObject.create({
        type: eventName
      }));
    });

    equal(textArea.get('value'), 'new value', 'value property updates on ' + eventName + ' events');
  });
});

QUnit.test("should call the insertNewline method when return key is pressed", function() {
  var wasCalled;
  var event = EmberObject.create({
    keyCode: 13
  });

  run(function() { textArea.append(); });

  textArea.insertNewline = function() {
    wasCalled = true;
  };

  textArea.trigger('keyUp', event);
  ok(wasCalled, "invokes insertNewline method");
});

QUnit.test("should call the cancel method when escape key is pressed", function() {
  var wasCalled;
  var event = EmberObject.create({
    keyCode: 27
  });

  run(function() { textArea.append(); });

  textArea.cancel = function() {
    wasCalled = true;
  };

  textArea.trigger('keyUp', event);
  ok(wasCalled, "invokes cancel method");
});
