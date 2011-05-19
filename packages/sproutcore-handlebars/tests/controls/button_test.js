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

  button.target = actionObject;
  button.action = 'myAction';

  button.append();

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

  button.append();

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

  button.target = actionObject;
  button.action = 'myAction';
  button.append();

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
