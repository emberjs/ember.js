// ==========================================================================
// Project:   SproutCore Handlebar Views
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var button, application;

var get = SC.get, set = SC.set;

module("SC.Button", {
  setup: function() {
    application = SC.Application.create();
    button = SC.Button.create();
  },

  teardown: function() {
    button.destroy();
    application.destroy();
  }
});

function synthesizeEvent(type, view) {
  view.$().trigger(type);
}

test("should trigger an action when clicked", function() {
  var wasClicked = false;

  var actionObject = SC.Object.create({
    myAction: function() {
      wasClicked = true;
    }
  });

  button.set('target', actionObject);
  button.set('action', 'myAction');

  SC.run(function() {
    button.appendTo('#qunit-fixture');
  });

  synthesizeEvent('mousedown', button);
  synthesizeEvent('mouseup', button);

  ok(wasClicked);
});

test("should trigger an action on a String target when clicked", function() {
  var wasClicked = false;

  window.MyApp = {
    myActionObject: SC.Object.create({
      myAction: function() {
        wasClicked = true;
      }
    })
  };

  var button = SC.Button.create({
    target: 'MyApp.myActionObject',
    action: 'myAction'
  });

  SC.run(function() {
    button.appendTo('#qunit-fixture');
  });

  synthesizeEvent('mousedown', button);
  synthesizeEvent('mouseup', button);

  ok(wasClicked);

  window.MyApp = undefined;
});

test("should not trigger action if mouse leaves area before mouseup", function() {
  var wasClicked = false;

  var actionObject = SC.Object.create({
    myAction: function() {
      wasClicked = true;
    }
  });

  button.set('target', actionObject);
  button.set('action', 'myAction');

  SC.run(function() {
    button.appendTo('#qunit-fixture');
  });

  synthesizeEvent('mousedown', button);
  ok(get(button, 'isActive'), "becomes active when hovered");
  ok(button.$().hasClass('is-active'));
  synthesizeEvent('mouseleave', button);
  ok(!get(button, 'isActive'), "loses active state if mouse exits");
  ok(!button.$().hasClass('is-active'));
  synthesizeEvent('mouseup', button);

  ok(!wasClicked);

  wasClicked = false;

  synthesizeEvent('mousedown', button);
  synthesizeEvent('mouseleave', button);
  synthesizeEvent('mouseenter', button);
  synthesizeEvent('mouseup', button);

  ok(wasClicked);
});

test("should by default be of type='button'", function() {
  SC.run(function() {
    button.appendTo('#qunit-fixture');
  });

  equals(button.$().attr('type'), 'button');
});

test("should have a configurable type", function() {
  button.set('type', 'submit');

  SC.run(function() {
    button.appendTo('#qunit-fixture');
  });
  
  equals(button.$().attr('type'), 'submit');
});

test("should allow the target to be the parentView", function() {
  button.set('target', 'parentView');
  
  equals(button.parentView, button.get('targetObject'));
});
