import { set } from "ember-metal/property_set";
import run from "ember-metal/run_loop";
import { changeProperties } from "ember-metal/property_events";
import { isWatching } from "ember-metal/watching";
import EmberObject from "ember-runtime/system/object";
import EmberView from "ember-views/views/view";

var view;

QUnit.module("EmberView - Class Name Bindings", {
  teardown: function() {
    run(function() {
      view.destroy();
    });
  }
});

QUnit.test("should apply bound class names to the element", function() {
  view = EmberView.create({
    classNameBindings: ['priority', 'isUrgent', 'isClassified:classified',
                        'canIgnore', 'messages.count', 'messages.resent:is-resent',
                        'isNumber:is-number', 'isFalsy::is-falsy', 'isTruthy::is-not-truthy',
                        'isEnabled:enabled:disabled'],

    priority: 'high',
    isUrgent: true,
    isClassified: true,
    canIgnore: false,
    isNumber: 5,
    isFalsy: 0,
    isTruthy: 'abc',
    isEnabled: true,

    messages: {
      count: 'five-messages',
      resent: true
    }
  });

  run(function() {
    view.createElement();
  });

  ok(view.$().hasClass('high'), "adds string values as class name");
  ok(view.$().hasClass('is-urgent'), "adds true Boolean values by dasherizing");
  ok(view.$().hasClass('classified'), "supports customizing class name for Boolean values");
  ok(view.$().hasClass('five-messages'), "supports paths in bindings");
  ok(view.$().hasClass('is-resent'), "supports customing class name for paths");
  ok(view.$().hasClass('is-number'), "supports colon syntax with truthy properties");
  ok(view.$().hasClass('is-falsy'), "supports colon syntax with falsy properties");
  ok(!view.$().hasClass('abc'), "does not add values as classes when falsy classes have been specified");
  ok(!view.$().hasClass('is-not-truthy'), "does not add falsy classes when values are truthy");
  ok(!view.$().hasClass('can-ignore'), "does not add false Boolean values as class");
  ok(view.$().hasClass('enabled'), "supports customizing class name for Boolean values with negation");
  ok(!view.$().hasClass('disabled'), "does not add class name for negated binding");
});

QUnit.test("should add, remove, or change class names if changed after element is created", function() {
  view = EmberView.create({
    classNameBindings: ['priority', 'isUrgent', 'isClassified:classified',
                        'canIgnore', 'messages.count', 'messages.resent:is-resent',
                        'isEnabled:enabled:disabled'],

    priority: 'high',
    isUrgent: true,
    isClassified: true,
    canIgnore: false,
    isEnabled: true,

    messages: EmberObject.create({
      count: 'five-messages',
      resent: false
    })
  });

  run(function() {
    view.createElement();
    set(view, 'priority', 'orange');
    set(view, 'isUrgent', false);
    set(view, 'canIgnore', true);
    set(view, 'isEnabled', false);
    set(view, 'messages.count', 'six-messages');
    set(view, 'messages.resent', true);
  });

  ok(view.$().hasClass('orange'), "updates string values");
  ok(!view.$().hasClass('high'), "removes old string value");

  ok(!view.$().hasClass('is-urgent', "removes dasherized class when changed from true to false"));
  ok(view.$().hasClass('can-ignore'), "adds dasherized class when changed from false to true");

  ok(view.$().hasClass('six-messages'), "adds new value when path changes");
  ok(!view.$().hasClass('five-messages'), "removes old value when path changes");

  ok(view.$().hasClass('is-resent'), "adds customized class name when path changes");

  ok(!view.$().hasClass('enabled'), "updates class name for negated binding");
  ok(view.$().hasClass('disabled'), "adds negated class name for negated binding");
});

QUnit.test(":: class name syntax works with an empty true class", function() {
  view = EmberView.create({
    isEnabled: false,
    classNameBindings: ['isEnabled::not-enabled']
  });

  run(function() { view.createElement(); });

  equal(view.$().attr('class'), 'ember-view not-enabled', "false class is rendered when property is false");

  run(function() { view.set('isEnabled', true); });

  equal(view.$().attr('class'), 'ember-view', "no class is added when property is true and the class is empty");
});

QUnit.test("classNames should not be duplicated on rerender", function() {
  run(function() {
    view = EmberView.create({
      classNameBindings: ['priority'],
      priority: 'high'
    });
  });


  run(function() {
    view.createElement();
  });

  equal(view.$().attr('class'), 'ember-view high');

  run(function() {
    view.rerender();
  });

  equal(view.$().attr('class'), 'ember-view high');
});

QUnit.test("classNameBindings should work when the binding property is updated and the view has been removed of the DOM", function() {
  run(function() {
    view = EmberView.create({
      classNameBindings: ['priority'],
      priority: 'high'
    });
  });


  run(function() {
    view.createElement();
  });

  equal(view.$().attr('class'), 'ember-view high');

  run(function() {
    view.remove();
  });

  view.set('priority', 'low');

  run(function() {
    view.append();
  });

  equal(view.$().attr('class'), 'ember-view low');

});

QUnit.test("classNames removed by a classNameBindings observer should not re-appear on rerender", function() {
  view = EmberView.create({
    classNameBindings: ['isUrgent'],
    isUrgent: true
  });

  run(function() {
    view.createElement();
  });

  equal(view.$().attr('class'), 'ember-view is-urgent');

  run(function() {
    view.set('isUrgent', false);
  });

  equal(view.$().attr('class'), 'ember-view');

  run(function() {
    view.rerender();
  });

  equal(view.$().attr('class'), 'ember-view');
});

QUnit.test("classNameBindings lifecycle test", function() {
  run(function() {
    view = EmberView.create({
      classNameBindings: ['priority'],
      priority: 'high'
    });
  });

  equal(isWatching(view, 'priority'), false);

  run(function() {
    view.createElement();
  });

  equal(view.$().attr('class'), 'ember-view high');
  equal(isWatching(view, 'priority'), true);

  run(function() {
    view.remove();
    view.set('priority', 'low');
  });

  equal(isWatching(view, 'priority'), false);
});

QUnit.test("classNameBindings should not fail if view has been removed", function() {
  run(function() {
    view = EmberView.create({
      classNameBindings: ['priority'],
      priority: 'high'
    });
  });
  run(function() {
    view.createElement();
  });
  var error;
  try {
    run(function() {
      changeProperties(function() {
        view.set('priority', 'low');
        view.remove();
      });
    });
  } catch(e) {
    error = e;
  }
  ok(!error, error);
});

QUnit.test("classNameBindings should not fail if view has been destroyed", function() {
  run(function() {
    view = EmberView.create({
      classNameBindings: ['priority'],
      priority: 'high'
    });
  });
  run(function() {
    view.createElement();
  });
  var error;
  try {
    run(function() {
      changeProperties(function() {
        view.set('priority', 'low');
        view.destroy();
      });
    });
  } catch(e) {
    error = e;
  }
  ok(!error, error);
});

QUnit.test("Providing a binding with a space in it asserts", function() {
  view = EmberView.create({
    classNameBindings: 'i:think:i am:so:clever'
  });

  expectAssertion(function() {
    view.createElement();
  }, /classNameBindings must not have spaces in them/i);
});

