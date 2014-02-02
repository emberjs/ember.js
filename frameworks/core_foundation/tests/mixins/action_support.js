// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*global module test equals context ok same */

(function() {
  var target, pane, sendActionSpy, view;

  module("SC.ActionSupport", {
    setup: function() {
      target = SC.Object.create({
        mainAction: function() {},
        someAction: function() {}
      });

      var rootResponder = {sendAction: function(){} };
      sendActionSpy = CoreTest.spyOn(rootResponder, 'sendAction');

      pane = SC.Object.create({
        rootResponder: rootResponder
      });

      view = SC.View.create(SC.ActionSupport, {
        action: null,
        zomgAction: null,
        pane: pane,

        someEvent: function() {
          return this.fireAction(this.get('zomgAction'));
        }
      });
    },

    teardown: function() {
      target = pane = sendActionSpy = view = null;
    }
  });


  // ..........................................................
  // No Parameters
  // 

  test("no paramaters - only action set", function() {
    var expectedAction = 'someAction';

    view.set('action', expectedAction);
    view.fireAction();

    ok(sendActionSpy.wasCalledWith(expectedAction, null, view, pane, null, view), 'triggers the action');
  });

  test("no paramaters - action and target set", function() {
    var expectedAction = 'someAction';

    view.set('target', target);
    view.set('action', expectedAction);
    view.fireAction();

    ok(sendActionSpy.wasCalledWith(expectedAction, target, view, pane, null, view), 'triggers the action');
  });


  // ..........................................................
  // Actions Parameter
  // 

  test("action parameter - only action set", function() {
    var expectedAction = 'someAction';

    view.set('zomgAction', expectedAction);
    view.someEvent();

    ok(sendActionSpy.wasCalledWith(expectedAction, null, view, pane, null, view), 'triggers the action');
  });

  test("action parameter - action and target set", function() {
    var expectedAction = 'someAction';

    view.set('target', target);
    view.set('zomgAction', expectedAction);
    view.someEvent();

    ok(sendActionSpy.wasCalledWith(expectedAction, target, view, pane, null, view), 'triggers the action');
  });


  // ..........................................................
  // Action Context
  // 

  test("context", function() {
    var expectedAction = 'someAction';
    var context = {zomg: "context"};

    view.set('action', expectedAction);
    view.set('actionContext', context)
    view.fireAction();

    ok(sendActionSpy.wasCalledWith(expectedAction, null, view, pane, context, view), 'triggers the action');
  });

})();