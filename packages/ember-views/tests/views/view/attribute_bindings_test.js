import Ember from "ember-metal/core";
import run from "ember-metal/run_loop";
import { observersFor } from "ember-metal/observer";
import { changeProperties } from "ember-metal/property_events";
import { SafeString } from "ember-htmlbars/utils/string";

import EmberView from "ember-views/views/view";

var originalLookup = Ember.lookup;
var lookup, view;

var appendView = function() {
  run(function() { view.appendTo('#qunit-fixture'); });
};

QUnit.module("EmberView - Attribute Bindings", {
  setup() {
    Ember.lookup = lookup = {};
  },
  teardown() {
    if (view) {
      run(function() {
        view.destroy();
      });
      view = null;
    }
    Ember.lookup = originalLookup;
  }
});

QUnit.test("should render attribute bindings", function() {
  view = EmberView.create({
    attributeBindings: ['type', 'destroyed', 'exists', 'nothing', 'notDefined', 'notNumber', 'explosions'],

    type: 'submit',
    exists: true,
    nothing: null,
    notDefined: undefined
  });

  run(function() {
    view.createElement();
  });

  equal(view.$().attr('type'), 'submit', "updates type attribute");
  ok(view.$().attr('exists'), "adds exists attribute when true");
  ok(!view.$().attr('nothing'), "removes nothing attribute when null");
  equal(view.$().attr('notDefined'), undefined, "removes notDefined attribute when undefined");
});

QUnit.test("should normalize case for attribute bindings", function() {
  view = EmberView.create({
    tagName: 'input',
    attributeBindings: ['disAbled'],
    disAbled: true
  });

  run(function() {
    view.createElement();
  });

  ok(view.$().prop('disabled'), "sets property with correct case");
});

QUnit.test("should render attribute bindings on input", function() {
  view = EmberView.create({
    tagName: 'input',
    attributeBindings: ['type', 'isDisabled:disabled'],

    type: 'submit',
    isDisabled: true
  });

  run(function() {
    view.createElement();
  });

  equal(view.$().attr('type'), 'submit', "updates type attribute");
  ok(view.$().prop('disabled'), "supports customizing attribute name for Boolean values");
});

QUnit.test("should update attribute bindings", function() {
  view = EmberView.create({
    attributeBindings: ['type', 'color:data-color', 'exploded', 'collapsed', 'times'],
    type: 'reset',
    color: 'red',
    exploded: 'bang',
    collapsed: null,
    times: 15
  });

  run(function() {
    view.createElement();
  });

  equal(view.$().attr('type'), 'reset', "adds type attribute");
  equal(view.$().attr('data-color'), 'red', "attr value set with ternary");
  equal(view.$().attr('exploded'), 'bang', "adds exploded attribute when it has a value");
  ok(!view.$().attr('collapsed'), "does not add null attribute");
  equal(view.$().attr('times'), '15', 'sets an integer to an attribute');

  run(function() {
    view.set('type', 'submit');
    view.set('color', 'blue');
    view.set('exploded', null);
    view.set('collapsed', 'swish');
    view.set('times', 16);
  });

  equal(view.$().attr('type'), 'submit', "adds type attribute");
  equal(view.$().attr('data-color'), 'blue', "attr value set with ternary");
  ok(!view.$().attr('exploded'), "removed exploded attribute when it is null");
  ok(view.$().attr('collapsed'), "swish", "adds an attribute when it has a value");
  equal(view.$().attr('times'), '16', 'updates an integer attribute');
});

QUnit.test("should update attribute bindings on input (boolean)", function() {
  view = EmberView.create({
    tagName: 'input',
    attributeBindings: ['disabled'],
    disabled: true
  });

  run(function() {
    view.createElement();
  });

  ok(view.$().prop('disabled'), "adds disabled property when true");

  run(function() {
    view.set('disabled', false);
  });

  ok(!view.$().prop('disabled'), "updates disabled property when false");
});

QUnit.test("should update attribute bindings on input (raw number prop)", function() {
  view = EmberView.create({
    tagName: 'input',
    attributeBindings: ['size'],
    size: 20
  });

  run(function() {
    view.createElement();
  });

  equal(view.$().prop('size'), 20, "adds size property");

  run(function() {
    view.set('size', 10);
  });

  equal(view.$().prop('size'), 10, "updates size property");
});

QUnit.test("should update attribute bindings on input (name)", function() {
  view = EmberView.create({
    tagName: 'input',
    attributeBindings: ['name'],
    name: 'bloody-awful'
  });

  run(function() {
    view.createElement();
  });

  equal(view.$().prop('name'), 'bloody-awful', "adds name property");

  run(function() {
    view.set('name', 'simply-grand');
  });

  equal(view.$().prop('name'), 'simply-grand', "updates name property");
});

QUnit.test("should update attribute bindings with micro syntax", function() {
  view = EmberView.create({
    tagName: 'input',
    attributeBindings: ['isDisabled:disabled'],
    type: 'reset',
    isDisabled: true
  });

  run(function() {
    view.createElement();
  });
  ok(view.$().prop('disabled'), "adds disabled property when true");

  run(function() {
    view.set('isDisabled', false);
  });
  ok(!view.$().prop('disabled'), "updates disabled property when false");
});

QUnit.test("should allow namespaced attributes in micro syntax", function () {
  view = EmberView.create({
    attributeBindings: ['xlinkHref:xlink:href'],
    xlinkHref: '/foo.png'
  });

  run(function() {
    view.createElement();
  });
  equal(view.$().attr('xlink:href'), '/foo.png', "namespaced attribute is set");

  run(function () {
    view.set('xlinkHref', '/bar.png');
  });
  equal(view.$().attr('xlink:href'), '/bar.png', "namespaced attribute is updated");
});

QUnit.test("should update attribute bindings on svg", function() {
  view = EmberView.create({
    attributeBindings: ['viewBox'],
    viewBox: null
  });

  run(function() {
    view.createElement();
  });

  equal(view.$().attr('viewBox'), null, "viewBox can be null");

  run(function() {
    view.set('viewBox', '0 0 100 100');
  });

  equal(view.$().attr('viewBox'), '0 0 100 100', "viewBox can be updated");
});

// This comes into play when using the {{#each}} helper. If the
// passed array item is a String, it will be converted into a
// String object instead of a normal string.
QUnit.test("should allow binding to String objects", function() {
  view = EmberView.create({
    attributeBindings: ['foo'],
    // JSHint doesn't like `new String` so we'll create it the same way it gets created in practice
    foo: (function() { return this; }).call("bar")
  });

  run(function() {
    view.createElement();
  });


  equal(view.$().attr('foo'), 'bar', "should convert String object to bare string");

  run(function() {
    view.set('foo', null);
  });

  ok(!view.$().attr('foo'), "removes foo attribute when null");
});

QUnit.skip("should teardown observers on rerender", function() {
  view = EmberView.create({
    attributeBindings: ['foo'],
    classNameBindings: ['foo'],
    foo: 'bar'
  });

  appendView();

  equal(observersFor(view, 'foo').length, 2, 'observer count after render is two');

  run(function() {
    view.rerender();
  });

  equal(observersFor(view, 'foo').length, 2, 'observer count after rerender remains two');
});

QUnit.test("handles attribute bindings for properties", function() {
  view = EmberView.create({
    tagName: 'input',
    attributeBindings: ['checked'],
    checked: null
  });

  appendView();

  equal(!!view.$().prop('checked'), false, 'precond - is not checked');

  run(function() {
    view.set('checked', true);
  });

  equal(view.$().prop('checked'), true, 'changes to checked');

  run(function() {
    view.set('checked', false);
  });

  equal(!!view.$().prop('checked'), false, 'changes to unchecked');
});

QUnit.test("handles `undefined` value for properties", function() {
  view = EmberView.create({
    tagName: 'input',
    attributeBindings: ['value'],
    value: "test"
  });

  appendView();

  equal(view.$().prop('value'), "test", "value is defined");

  run(function() {
    view.set('value', undefined);
  });

  equal(view.$().prop('value'), '', "value is blank");
});

QUnit.test("handles null value for attributes on text fields", function() {
  view = EmberView.create({
    tagName: 'input',
    attributeBindings: ['value']
  });

  appendView();

  view.$().attr('value', 'test');

  equal(view.$().attr('value'), "test", "value is defined");

  run(function() {
    view.set('value', null);
  });

  equal(!!view.$().prop('value'), false, "value is not defined");
});

QUnit.test("handles a 0 value attribute on text fields", function() {
  view = EmberView.create({
    tagName: 'input',
    attributeBindings: ['value']
  });

  appendView();

  view.$().attr('value', 'test');
  equal(view.$().attr('value'), "test", "value is defined");

  run(function() {
    view.set('value', 0);
  });
  strictEqual(view.$().prop('value'), "0", "value should be 0");
});

QUnit.test("attributeBindings should not fail if view has been removed", function() {
  run(function() {
    view = EmberView.create({
      attributeBindings: ['checked'],
      checked: true
    });
  });
  run(function() {
    view.createElement();
  });
  var error;
  try {
    run(function() {
      changeProperties(function() {
        view.set('checked', false);
        view.remove();
      });
    });
  } catch(e) {
    error = e;
  }
  ok(!error, error);
});

QUnit.test("attributeBindings should not fail if view has been destroyed", function() {
  run(function() {
    view = EmberView.create({
      attributeBindings: ['checked'],
      checked: true
    });
  });
  run(function() {
    view.createElement();
  });
  var error;
  try {
    run(function() {
      changeProperties(function() {
        view.set('checked', false);
        view.destroy();
      });
    });
  } catch(e) {
    error = e;
  }
  ok(!error, error);
});

QUnit.test("asserts if an attributeBinding is setup on class", function() {
  view = EmberView.create({
    attributeBindings: ['class']
  });

  expectAssertion(function() {
    appendView();
  }, 'You cannot use class as an attributeBinding, use classNameBindings instead.');

  // Remove render node to avoid "Render node exists without concomitant env"
  // assertion on teardown.
  view.renderNode = null;
});

QUnit.test("blacklists href bindings based on protocol", function() {
  /* jshint scripturl:true */

  view = EmberView.create({
    tagName: 'a',
    attributeBindings: ['href'],
    href: "javascript:alert('foo')"
  });

  appendView();

  equal(view.$().attr('href'), "unsafe:javascript:alert('foo')", "value property sanitized");

  run(function() {
    view.set('href', new SafeString(view.get('href')));
  });

  equal(view.$().attr('href'), "javascript:alert('foo')", "value is not defined");
});

QUnit.test("attributeBindings should be overridable", function() {
  var ParentView = EmberView.extend({
    attributeBindings: ['href'],
    href: "an href"
  });

  var ChildView = ParentView.extend({
    attributeBindings: ['newHref:href'],
    newHref: "a new href"
  });

  view = ChildView.create();

  appendView();

  equal(view.$().attr('href'), "a new href", "expect value from subclass attribute binding");
});
