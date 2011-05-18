// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var view;
var application;

module("SC.EventDispatcher", {
  setup: function() {
    application = SC.Application.create();
  },

  teardown: function() {
    if (view) { view.destroy(); }
    application.destroy();
  }
});

test("should dispatch events to views", function() {
  var receivedEvent;
  var childKeyDownCalled = 0;
  var parentKeyDownCalled = 0;

  view = SC.View.create({
    childViews: ['child'],

    child: SC.View.extend({
      render: function(buffer) {
        buffer.push('<span id="wot">ewot</span>');
      },

      keyDown: function(evt) {
        childKeyDownCalled++;

        return false;
      }
    }),

    render: function(buffer) {
      buffer.push('some <span>awesome</span> content');
    },

    mouseDown: function(evt) {
      receivedEvent = evt;
    },

    keyDown: function(evt) {
      parentKeyDownCalled++;
    }
  });

  view.append();
  view.$().trigger('mousedown');

  ok(receivedEvent, "passes event to associated event method");
  receivedEvent = null;

  view.$('span').trigger('mousedown');
  ok(receivedEvent, "event bubbles up to nearest SC.View");
  receivedEvent = null;

  SC.$('#wot').trigger('mousedown');
  ok(receivedEvent, "event bubbles up to nearest SC.View");

  SC.$('#wot').trigger('keydown');
  equals(childKeyDownCalled, 1, "calls keyDown on child view");
  equals(parentKeyDownCalled, 0, "does not call keyDown on parent if child handles event");
});


test("should send change events up view hierarchy if view contains form elements", function() {
  var receivedEvent;
  view = SC.View.create({
    render: function(buffer) {
      buffer.push('<input id="is-done" type="checkbox">');
    },

    change: function(evt) {
      receivedEvent = evt;
    }
  });

  view.append();
  SC.$('#is-done').trigger('change');
  ok(receivedEvent, "calls change method when a child element is changed");
  equals(receivedEvent.target, SC.$('#is-done')[0], "target property is the element that was clicked");
});

