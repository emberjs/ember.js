var button, rootResponder, pane, expectedAction, targetObject, sendActionSpy;

module("SC.Button", {
  setup: function() {
    expectedAction = 'myAction';
    targetObject = SC.Object.create({
      myAction: function() {
      }
    });

    var rootResponder = {sendAction: function(){} };
    sendActionSpy = CoreTest.spyOn(rootResponder, 'sendAction');

    pane = SC.Object.create({
      rootResponder: rootResponder
    });

    button = SC.Button.create({
      target: targetObject,
      action: 'myAction',
      pane: pane
    });
  }
});

test("#mouseUp - triggers the action when mouse is over the button", function() {
  button.set('isActive', true);

  button.mouseUp();

  ok(sendActionSpy.wasCalledWith(expectedAction, targetObject, button, pane, null, button), 'triggers the action');
});

test("#mouseUp - does not trigger action if mouse is not over the button", function() {
  button.set('isActive', false);

  button.mouseUp();
  ok(!sendActionSpy.wasCalled, 'should not trigger the action');
});

test('#mouseUp - makes the button no longer active', function () {
  button.set('isActive', true);
  button.mouseUp();

  equals(button.get('isActive'), false, 'should set the button to not be active');
});

test('#mouseDown - makes the button active', function() {
  button.set('isActive', false);
  button.mouseDown();

  equals(button.get('isActive'), true, 'should set the button to be active');
});

test('#mouseExited - makes but button no longer active', function() {
  button.set('isActive', false);
  button.mouseExited();

  equals(button.get('isActive'), false, 'should set the button to no longer be active');
});
