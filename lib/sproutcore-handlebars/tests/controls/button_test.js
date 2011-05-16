var button, application;

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
  ok(button.get('isActive'), "becomes active when hovered");
  ok(button.$().hasClass('is-active'));
  synthesizeEvent('mouseleave', button);
  ok(!button.get('isActive'), "loses active state if mouse exits");
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
