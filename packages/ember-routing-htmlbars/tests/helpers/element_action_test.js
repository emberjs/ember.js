import Ember from 'ember-metal/core'; // A, FEATURES, assert
import { set } from 'ember-metal/property_set';
import run from 'ember-metal/run_loop';
import EventDispatcher from 'ember-views/system/event_dispatcher';
import ActionManager from 'ember-views/system/action_manager';

import EmberObject from 'ember-runtime/system/object';
import EmberController from 'ember-runtime/controllers/controller';

import compile from 'ember-template-compiler/system/compile';
import EmberView from 'ember-views/views/view';
import EmberComponent from 'ember-views/components/component';
import jQuery from 'ember-views/system/jquery';

import { ActionHelper } from 'ember-routing-htmlbars/keywords/element-action';

import { registerKeyword, resetKeyword } from 'ember-htmlbars/tests/utils';
import viewKeyword from 'ember-htmlbars/keywords/view';

import {
  runAppend,
  runDestroy
} from 'ember-runtime/tests/utils';

var dispatcher, view, originalViewKeyword;
var originalRegisterAction = ActionHelper.registerAction;

QUnit.module('ember-routing-htmlbars: action helper', {
  setup() {
    originalViewKeyword = registerKeyword('view',  viewKeyword);
    dispatcher = EventDispatcher.create();
    dispatcher.setup();
  },

  teardown() {
    runDestroy(view);
    runDestroy(dispatcher);
    resetKeyword('view', originalViewKeyword);

    ActionHelper.registerAction = originalRegisterAction;
  }
});

QUnit.test('should output a data attribute with a guid', function() {
  view = EmberView.create({
    template: compile('<a href="#" {{action "edit"}}>edit</a>')
  });

  runAppend(view);

  ok(view.$('a').attr('data-ember-action').match(/\d+/), 'A data-ember-action attribute with a guid was added');
});

QUnit.test('should by default register a click event', function() {
  var registeredEventName;

  ActionHelper.registerAction = function({ eventName }) {
    registeredEventName = eventName;
  };

  view = EmberView.create({
    template: compile('<a href="#" {{action "edit"}}>edit</a>')
  });

  runAppend(view);

  equal(registeredEventName, 'click', 'The click event was properly registered');
});

QUnit.test('should allow alternative events to be handled', function() {
  var registeredEventName;

  ActionHelper.registerAction = function({ eventName }) {
    registeredEventName = eventName;
  };

  view = EmberView.create({
    template: compile('<a href="#" {{action "edit" on="mouseUp"}}>edit</a>')
  });

  runAppend(view);

  equal(registeredEventName, 'mouseUp', 'The alternative mouseUp event was properly registered');
});

QUnit.test('should by default target the view\'s controller', function() {
  var registeredTarget;
  var controller = {};

  ActionHelper.registerAction = function({ node }) {
    registeredTarget = node.state.target;
  };

  view = EmberView.create({
    controller: controller,
    template: compile('<a href="#" {{action "edit"}}>edit</a>')
  });

  runAppend(view);

  equal(registeredTarget, controller, 'The controller was registered as the target');
});

QUnit.test('Inside a yield, the target points at the original target', function() {
  var watted = false;

  var component = EmberComponent.extend({
    boundText: 'inner',
    truthy: true,
    obj: {},
    layout: compile('<div>{{boundText}}</div><div>{{#if truthy}}{{yield}}{{/if}}</div>')
  });

  view = EmberView.create({
    controller: {
      boundText: 'outer',
      truthy: true,
      wat() {
        watted = true;
      },
      component: component
    },
    template: compile('{{#if truthy}}{{#view component}}{{#if truthy}}<div {{action "wat"}} class="wat">{{boundText}}</div>{{/if}}{{/view}}{{/if}}')
  });

  runAppend(view);

  run(function() {
    view.$('.wat').click();
  });

  equal(watted, true, 'The action was called on the right context');
});

QUnit.test('should allow a target to be specified', function() {
  var registeredTarget;

  ActionHelper.registerAction = function({ node }) {
    registeredTarget = node.state.target;
  };

  var anotherTarget = EmberView.create();

  view = EmberView.create({
    controller: {},
    template: compile('<a href="#" {{action "edit" target=view.anotherTarget}}>edit</a>'),
    anotherTarget: anotherTarget
  });

  runAppend(view);

  equal(registeredTarget, anotherTarget, 'The specified target was registered');

  runDestroy(anotherTarget);
});

QUnit.test('should lazily evaluate the target', function() {
  var firstEdit = 0;
  var secondEdit = 0;
  var controller = {};
  var first = {
    edit() {
      firstEdit++;
    }
  };

  var second = {
    edit() {
      secondEdit++;
    }
  };

  controller.theTarget = first;

  view = EmberView.create({
    controller: controller,
    template: compile('<a href="#" {{action "edit" target=theTarget}}>edit</a>')
  });

  runAppend(view);

  run(function() {
    jQuery('a').trigger('click');
  });

  equal(firstEdit, 1);

  run(function() {
    set(controller, 'theTarget', second);
  });

  run(function() {
    jQuery('a').trigger('click');
  });

  equal(firstEdit, 1);
  equal(secondEdit, 1);
});

QUnit.test('should register an event handler', function() {
  var eventHandlerWasCalled = false;

  var controller = EmberController.extend({
    actions: { edit() { eventHandlerWasCalled = true; } }
  }).create();

  view = EmberView.create({
    controller: controller,
    template: compile('<a href="#" {{action "edit"}}>click me</a>')
  });

  runAppend(view);

  var actionId = view.$('a[data-ember-action]').attr('data-ember-action');

  ok(ActionManager.registeredActions[actionId], 'The action was registered');

  view.$('a').trigger('click');

  ok(eventHandlerWasCalled, 'The event handler was called');
});

QUnit.test('handles whitelisted modifier keys', function() {
  var eventHandlerWasCalled = false;
  var shortcutHandlerWasCalled = false;

  var controller = EmberController.extend({
    actions: {
      edit() { eventHandlerWasCalled = true; },
      shortcut() { shortcutHandlerWasCalled = true; }
    }
  }).create();

  view = EmberView.create({
    controller: controller,
    template: compile('<a href="#" {{action "edit" allowedKeys="alt"}}>click me</a> <div {{action "shortcut" allowedKeys="any"}}>click me too</div>')
  });

  runAppend(view);

  var actionId = view.$('a[data-ember-action]').attr('data-ember-action');

  ok(ActionManager.registeredActions[actionId], 'The action was registered');

  var e = jQuery.Event('click');
  e.altKey = true;
  view.$('a').trigger(e);

  ok(eventHandlerWasCalled, 'The event handler was called');

  e = jQuery.Event('click');
  e.ctrlKey = true;
  view.$('div').trigger(e);

  ok(shortcutHandlerWasCalled, 'The "any" shortcut\'s event handler was called');
});

QUnit.test('should be able to use action more than once for the same event within a view', function() {
  var editWasCalled = false;
  var deleteWasCalled = false;
  var originalEventHandlerWasCalled = false;

  var controller = EmberController.extend({
    actions: {
      edit() { editWasCalled = true; },
      'delete'() { deleteWasCalled = true; }
    }
  }).create();

  view = EmberView.create({
    controller: controller,
    template: compile(
      '<a id="edit" href="#" {{action "edit"}}>edit</a><a id="delete" href="#" {{action "delete"}}>delete</a>'
    ),
    click() { originalEventHandlerWasCalled = true; }
  });

  runAppend(view);

  view.$('#edit').trigger('click');

  equal(editWasCalled, true, 'The edit action was called');
  equal(deleteWasCalled, false, 'The delete action was not called');

  editWasCalled = deleteWasCalled = originalEventHandlerWasCalled = false;

  view.$('#delete').trigger('click');

  equal(editWasCalled, false, 'The edit action was not called');
  equal(deleteWasCalled, true, 'The delete action was called');

  editWasCalled = deleteWasCalled = originalEventHandlerWasCalled = false;

  view.$().trigger('click');

  equal(editWasCalled, false, 'The edit action was not called');
  equal(deleteWasCalled, false, 'The delete action was not called');
});

QUnit.test('the event should not bubble if `bubbles=false` is passed', function() {
  var editWasCalled = false;
  var deleteWasCalled = false;
  var originalEventHandlerWasCalled = false;

  var controller = EmberController.extend({
    actions: {
      edit() { editWasCalled = true; },
      'delete'() { deleteWasCalled = true; }
    }
  }).create();

  view = EmberView.create({
    controller: controller,
    template: compile(
      '<a id="edit" href="#" {{action "edit" bubbles=false}}>edit</a><a id="delete" href="#" {{action "delete" bubbles=false}}>delete</a>'
    ),
    click() { originalEventHandlerWasCalled = true; }
  });

  runAppend(view);

  view.$('#edit').trigger('click');

  equal(editWasCalled, true, 'The edit action was called');
  equal(deleteWasCalled, false, 'The delete action was not called');
  equal(originalEventHandlerWasCalled, false, 'The original event handler was not called');

  editWasCalled = deleteWasCalled = originalEventHandlerWasCalled = false;

  view.$('#delete').trigger('click');

  equal(editWasCalled, false, 'The edit action was not called');
  equal(deleteWasCalled, true, 'The delete action was called');
  equal(originalEventHandlerWasCalled, false, 'The original event handler was not called');

  editWasCalled = deleteWasCalled = originalEventHandlerWasCalled = false;

  view.$().trigger('click');

  equal(editWasCalled, false, 'The edit action was not called');
  equal(deleteWasCalled, false, 'The delete action was not called');
  equal(originalEventHandlerWasCalled, true, 'The original event handler was called');
});

QUnit.test('should work properly in an #each block', function() {
  var eventHandlerWasCalled = false;

  var controller = EmberController.extend({
    actions: { edit() { eventHandlerWasCalled = true; } }
  }).create();

  view = EmberView.create({
    controller: controller,
    items: Ember.A([1, 2, 3, 4]),
    template: compile('{{#each view.items as |item|}}<a href="#" {{action "edit"}}>click me</a>{{/each}}')
  });

  runAppend(view);

  view.$('a').trigger('click');

  ok(eventHandlerWasCalled, 'The event handler was called');
});

QUnit.test('should work properly in a {{#with foo as |bar|}} block', function() {
  var eventHandlerWasCalled = false;

  var controller = EmberController.extend({
    actions: { edit() { eventHandlerWasCalled = true; } }
  }).create();

  view = EmberView.create({
    controller: controller,
    something: { ohai: 'there' },
    template: compile('{{#with view.something as |somethingElse|}}<a href="#" {{action "edit"}}>click me</a>{{/with}}')
  });

  runAppend(view);

  view.$('a').trigger('click');

  ok(eventHandlerWasCalled, 'The event handler was called');
});

QUnit.test('should unregister event handlers on rerender', function() {
  var eventHandlerWasCalled = false;

  view = EmberView.extend({
    template: compile('{{#if view.active}}<a href="#" {{action "edit"}}>click me</a>{{/if}}'),
    active: true,
    actions: { edit() { eventHandlerWasCalled = true; } }
  }).create();

  runAppend(view);

  var previousActionId = view.$('a[data-ember-action]').attr('data-ember-action');

  run(function() {
    set(view, 'active', false);
  });

  run(function() {
    set(view, 'active', true);
  });

  ok(!ActionManager.registeredActions[previousActionId], 'On rerender, the event handler was removed');

  var newActionId = view.$('a[data-ember-action]').attr('data-ember-action');

  ok(ActionManager.registeredActions[newActionId], 'After rerender completes, a new event handler was added');
});

QUnit.test('should unregister event handlers on inside virtual views', function() {
  var things = Ember.A([
    {
      name: 'Thingy'
    }
  ]);
  view = EmberView.create({
    template: compile('{{#each view.things as |thing|}}<a href="#" {{action "edit"}}>click me</a>{{/each}}'),
    things: things
  });

  runAppend(view);

  var actionId = view.$('a[data-ember-action]').attr('data-ember-action');

  run(function() {
    things.removeAt(0);
  });

  ok(!ActionManager.registeredActions[actionId], 'After the virtual view was destroyed, the action was unregistered');
});

QUnit.test('should properly capture events on child elements of a container with an action', function() {
  var eventHandlerWasCalled = false;

  var controller = EmberController.extend({
    actions: { edit() { eventHandlerWasCalled = true; } }
  }).create();

  view = EmberView.create({
    controller: controller,
    template: compile('<div {{action "edit"}}><button>click me</button></div>')
  });

  runAppend(view);

  view.$('button').trigger('click');

  ok(eventHandlerWasCalled, 'Event on a child element triggered the action of its parent');
});

QUnit.test('should allow bubbling of events from action helper to original parent event', function() {
  var eventHandlerWasCalled = false;
  var originalEventHandlerWasCalled = false;

  var controller = EmberController.extend({
    actions: { edit() { eventHandlerWasCalled = true; } }
  }).create();

  view = EmberView.create({
    controller: controller,
    template: compile('<a href="#" {{action "edit"}}>click me</a>'),
    click() { originalEventHandlerWasCalled = true; }
  });

  runAppend(view);

  view.$('a').trigger('click');

  ok(eventHandlerWasCalled && originalEventHandlerWasCalled, 'Both event handlers were called');
});

QUnit.test('should not bubble an event from action helper to original parent event if `bubbles=false` is passed', function() {
  var eventHandlerWasCalled = false;
  var originalEventHandlerWasCalled = false;

  var controller = EmberController.extend({
    actions: { edit() { eventHandlerWasCalled = true; } }
  }).create();

  view = EmberView.create({
    controller: controller,
    template: compile('<a href="#" {{action "edit" bubbles=false}}>click me</a>'),
    click() { originalEventHandlerWasCalled = true; }
  });

  runAppend(view);

  view.$('a').trigger('click');

  ok(eventHandlerWasCalled, 'The child handler was called');
  ok(!originalEventHandlerWasCalled, 'The parent handler was not called');
});

QUnit.test('should allow \'send\' as action name (#594)', function() {
  var eventHandlerWasCalled = false;

  var controller = EmberController.extend({
    send() { eventHandlerWasCalled = true; }
  }).create();

  view = EmberView.create({
    controller: controller,
    template: compile('<a href="#" {{action "send"}}>send</a>')
  });

  runAppend(view);

  view.$('a').trigger('click');

  ok(eventHandlerWasCalled, 'The view\'s send method was called');
});

QUnit.test('should send the view, event and current context to the action', function() {
  var passedTarget;
  var passedContext;

  var aTarget = EmberController.extend({
    actions: {
      edit(context) {
        passedTarget = this;
        passedContext = context;
      }
    }
  }).create();

  var aContext = { aTarget: aTarget };

  view = EmberView.create({
    context: aContext,
    template: compile('<a id="edit" href="#" {{action "edit" this target=aTarget}}>edit</a>')
  });

  runAppend(view);

  view.$('#edit').trigger('click');

  strictEqual(passedTarget, aTarget, 'the action is called with the target as this');
  strictEqual(passedContext, aContext, 'the parameter is passed along');
});

QUnit.test('should only trigger actions for the event they were registered on', function() {
  var editWasCalled = false;

  view = EmberView.extend({
    template: compile('<a href="#" {{action "edit"}}>edit</a>'),
    actions: { edit() { editWasCalled = true; } }
  }).create();

  runAppend(view);

  view.$('a').trigger('mouseover');

  ok(!editWasCalled, 'The action wasn\'t called');
});

QUnit.test('should unwrap controllers passed as a context', function() {
  var passedContext;
  var model = EmberObject.create();
  var controller = EmberController.extend({
    model: model,
    actions: {
      edit(context) {
        passedContext = context;
      }
    }
  }).create();

  view = EmberView.create({
    controller: controller,
    template: compile('<button {{action "edit" this}}>edit</button>')
  });

  runAppend(view);

  view.$('button').trigger('click');

  equal(passedContext, model, 'the action was passed the unwrapped model');
});

QUnit.test('should not unwrap controllers passed as `controller`', function() {
  var passedContext;
  var model = EmberObject.create();
  var controller = EmberController.extend({
    model: model,
    actions: {
      edit(context) {
        passedContext = context;
      }
    }
  }).create();

  view = EmberView.create({
    controller: controller,
    template: compile('<button {{action "edit" controller}}>edit</button>')
  });

  runAppend(view);

  view.$('button').trigger('click');

  equal(passedContext, controller, 'the action was passed the controller');
});

QUnit.test('should allow multiple contexts to be specified', function() {
  var passedContexts;
  var models = [EmberObject.create(), EmberObject.create()];

  var controller = EmberController.extend({
    actions: {
      edit() {
        passedContexts = [].slice.call(arguments);
      }
    }
  }).create();

  view = EmberView.create({
    controller: controller,
    modelA: models[0],
    modelB: models[1],
    template: compile('<button {{action "edit" view.modelA view.modelB}}>edit</button>')
  });

  runAppend(view);

  view.$('button').trigger('click');

  deepEqual(passedContexts, models, 'the action was called with the passed contexts');
});

QUnit.test('should allow multiple contexts to be specified mixed with string args', function() {
  var passedParams;
  var model = EmberObject.create();

  var controller = EmberController.extend({
    actions: {
      edit() {
        passedParams = [].slice.call(arguments);
      }
    }
  }).create();

  view = EmberView.create({
    controller: controller,
    modelA: model,
    template: compile('<button {{action "edit" "herp" view.modelA}}>edit</button>')
  });

  runAppend(view);

  view.$('button').trigger('click');

  deepEqual(passedParams, ['herp', model], 'the action was called with the passed contexts');
});

QUnit.test('it does not trigger action with special clicks', function() {
  var showCalled = false;

  view = EmberView.create({
    template: compile('<a {{action \'show\' href=true}}>Hi</a>')
  });

  var controller = EmberController.extend({
    actions: {
      show() {
        showCalled = true;
      }
    }
  }).create();

  run(function() {
    view.set('controller', controller);
    view.appendTo('#qunit-fixture');
  });

  function checkClick(prop, value, expected) {
    var event = jQuery.Event('click');
    event[prop] = value;
    view.$('a').trigger(event);
    if (expected) {
      ok(showCalled, 'should call action with ' + prop + ':' + value);
      ok(event.isDefaultPrevented(), 'should prevent default');
    } else {
      ok(!showCalled, 'should not call action with ' + prop + ':' + value);
      ok(!event.isDefaultPrevented(), 'should not prevent default');
    }
  }

  checkClick('ctrlKey', true, false);
  checkClick('altKey', true, false);
  checkClick('metaKey', true, false);
  checkClick('shiftKey', true, false);
  checkClick('which', 2, false);

  checkClick('which', 1, true);
  checkClick('which', undefined, true); // IE <9
});

QUnit.test('it can trigger actions for keyboard events', function() {
  var showCalled = false;

  view = EmberView.create({
    template: compile('<input type=\'text\' {{action \'show\' on=\'keyUp\'}}>')
  });

  var controller = EmberController.extend({
    actions: {
      show() {
        showCalled = true;
      }
    }
  }).create();

  run(function() {
    view.set('controller', controller);
    view.appendTo('#qunit-fixture');
  });

  var event = jQuery.Event('keyup');
  event.char = 'a';
  event.which = 65;
  view.$('input').trigger(event);
  ok(showCalled, 'should call action with keyup');
});

QUnit.test('a quoteless parameter should allow dynamic lookup of the actionName', function() {
  expect(4);
  var lastAction;
  var actionOrder = [];

  view = EmberView.create({
    template: compile('<a id=\'woot-bound-param\' {{action hookMeUp}}>Hi</a>')
  });

  var controller = EmberController.extend({
    hookMeUp: 'biggityBoom',
    actions: {
      biggityBoom() {
        lastAction = 'biggityBoom';
        actionOrder.push(lastAction);
      },
      whompWhomp() {
        lastAction = 'whompWhomp';
        actionOrder.push(lastAction);
      },
      sloopyDookie() {
        lastAction = 'sloopyDookie';
        actionOrder.push(lastAction);
      }
    }
  }).create();

  run(function() {
    view.set('controller', controller);
    view.appendTo('#qunit-fixture');
  });

  var testBoundAction = function(propertyValue) {
    run(function() {
      controller.set('hookMeUp', propertyValue);
    });

    run(function() {
      view.$('#woot-bound-param').click();
    });

    equal(lastAction, propertyValue, 'lastAction set to ' + propertyValue);
  };

  testBoundAction('whompWhomp');
  testBoundAction('sloopyDookie');
  testBoundAction('biggityBoom');

  deepEqual(actionOrder, ['whompWhomp', 'sloopyDookie', 'biggityBoom'], 'action name was looked up properly');
});

QUnit.test('a quoteless parameter should lookup actionName in context [DEPRECATED]', function() {
  expect(4);
  var lastAction;
  var actionOrder = [];

  ignoreDeprecation(function() {
    view = EmberView.create({
      template: compile('{{#each allactions as |allacation|}}<a id="{{allacation.name}}" {{action allacation.name}}>{{allacation.title}}</a>{{/each}}')
    });
  });

  var controller = EmberController.extend({
    allactions: Ember.A([{ title: 'Biggity Boom', name: 'biggityBoom' },
                         { title: 'Whomp Whomp', name: 'whompWhomp' },
                         { title: 'Sloopy Dookie', name: 'sloopyDookie' }]),
    actions: {
      biggityBoom() {
        lastAction = 'biggityBoom';
        actionOrder.push(lastAction);
      },
      whompWhomp() {
        lastAction = 'whompWhomp';
        actionOrder.push(lastAction);
      },
      sloopyDookie() {
        lastAction = 'sloopyDookie';
        actionOrder.push(lastAction);
      }
    }
  }).create();

  run(function() {
    view.set('controller', controller);
    view.appendTo('#qunit-fixture');
  });

  var testBoundAction = function(propertyValue) {
    run(function() {
      view.$('#' + propertyValue).click();
    });

    equal(lastAction, propertyValue, 'lastAction set to ' + propertyValue);
  };

  testBoundAction('whompWhomp');
  testBoundAction('sloopyDookie');
  testBoundAction('biggityBoom');

  deepEqual(actionOrder, ['whompWhomp', 'sloopyDookie', 'biggityBoom'], 'action name was looked up properly');
});

QUnit.test('a quoteless string parameter should resolve actionName, including path', function() {
  expect(4);
  var lastAction;
  var actionOrder = [];

  view = EmberView.create({
    template: compile('{{#each allactions as |item|}}<a id="{{item.name}}" {{action item.name}}>{{item.title}}</a>{{/each}}')
  });

  var controller = EmberController.extend({
    allactions: Ember.A([{ title: 'Biggity Boom', name: 'biggityBoom' },
                         { title: 'Whomp Whomp', name: 'whompWhomp' },
                         { title: 'Sloopy Dookie', name: 'sloopyDookie' }]),
    actions: {
      biggityBoom() {
        lastAction = 'biggityBoom';
        actionOrder.push(lastAction);
      },
      whompWhomp() {
        lastAction = 'whompWhomp';
        actionOrder.push(lastAction);
      },
      sloopyDookie() {
        lastAction = 'sloopyDookie';
        actionOrder.push(lastAction);
      }
    }
  }).create();

  run(function() {
    view.set('controller', controller);
    view.appendTo('#qunit-fixture');
  });

  var testBoundAction = function(propertyValue) {
    run(function() {
      view.$('#' + propertyValue).click();
    });

    equal(lastAction, propertyValue, 'lastAction set to ' + propertyValue);
  };

  testBoundAction('whompWhomp');
  testBoundAction('sloopyDookie');
  testBoundAction('biggityBoom');

  deepEqual(actionOrder, ['whompWhomp', 'sloopyDookie', 'biggityBoom'], 'action name was looked up properly');
});

QUnit.test('a quoteless function parameter should be called, including arguments', function() {
  expect(2);

  var arg = 'rough ray';

  view = EmberView.create({
    template: compile(`<a {{action submit '${arg}'}}></a>`)
  });

  var controller = EmberController.extend({
    submit(actualArg) {
      ok(true, 'submit function called');
      equal(actualArg, arg, 'argument passed');
    }
  }).create();

  run(function() {
    view.set('controller', controller);
    view.appendTo('#qunit-fixture');
  });

  run(function() {
    view.$('a').click();
  });
});

QUnit.test('a quoteless parameter that does not resolve to a value asserts', function() {
  var controller = EmberController.extend({
    actions: {
      ohNoeNotValid() {}
    }
  }).create();

  view = EmberView.create({
    controller: controller,
    template: compile('<a id=\'oops-bound-param\' {{action ohNoeNotValid}}>Hi</a>')
  });

  expectAssertion(function() {
    run(function() {
      view.appendTo('#qunit-fixture');
    });
  }, 'You specified a quoteless path to the {{action}} helper ' +
     'which did not resolve to an action name (a string). ' +
     'Perhaps you meant to use a quoted actionName? (e.g. {{action \'save\'}}).');
});

QUnit.test('allows multiple actions on a single element', function() {
  var clickActionWasCalled = false;
  var doubleClickActionWasCalled = false;

  var controller = EmberController.extend({
    actions: {
      clicked() {
        clickActionWasCalled = true;
      },

      doubleClicked() {
        doubleClickActionWasCalled = true;
      }
    }
  }).create();

  view = EmberView.create({
    controller: controller,
    template: compile(`
      <a href="#"
        {{action "clicked" on="click"}}
        {{action "doubleClicked" on="doubleClick"}}
      >click me</a>
    `)
  });

  runAppend(view);

  var actionId = view.$('a[data-ember-action]').attr('data-ember-action');

  ok(ActionManager.registeredActions[actionId], 'The action was registered');

  view.$('a').trigger('click');

  ok(clickActionWasCalled, 'The clicked action was called');

  view.$('a').trigger('dblclick');

  ok(doubleClickActionWasCalled, 'The double click handler was called');
});

QUnit.module('ember-routing-htmlbars: action helper - deprecated invoking directly on target', {
  setup() {
    dispatcher = EventDispatcher.create();
    dispatcher.setup();
  },

  teardown() {
    runDestroy(view);
    runDestroy(dispatcher);
  }
});

QUnit.test('should respect preventDefault=false option if provided', function() {
  view = EmberView.create({
    template: compile('<a {{action \'show\' preventDefault=false}}>Hi</a>')
  });

  var controller = EmberController.extend({
    actions: {
      show() { }
    }
  }).create();

  run(function() {
    view.set('controller', controller);
    runAppend(view);
  });

  var event = jQuery.Event('click');
  view.$('a').trigger(event);

  equal(event.isDefaultPrevented(), false, 'should not preventDefault');
});
