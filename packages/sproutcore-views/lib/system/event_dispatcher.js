// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  @ignore

  SC.EventDispatcher handles delegating browser events to their corresponding
  SC.Views. For example, when you click on a view, SC.EventDispatcher ensures
  that that view's `mouseDown` method gets called.
*/
SC.EventDispatcher = SC.Object.extend(
/** @scope SC.EventDispatcher.prototype */{

  /**
    @private

    The root DOM element to which event listeners should be attached. Event
    listeners will be attached to the document unless this is overridden.

    @type DOMElement
    @default document
  */
  rootElement: document,

  /**
    @private

    Sets up event listeners for standard browser events.

    This will be called after the browser sends a DOMContentReady event. By
    default, it will set up all of the listeners on the document body. If you
    would like to register the listeners on different element, set the event
    dispatcher's `root` property.
  */
  setup: function() {
    var event, events = {
      touchstart  : 'touchStart',
      touchmove   : 'touchMove',
      touchend    : 'touchEnd',
      touchcancel : 'touchCancel',
      keydown     : 'keyDown',
      keyup       : 'keyUp',
      keypress    : 'keyPress',
      mousedown   : 'mouseDown',
      mouseup     : 'mouseUp',
      click       : 'click',
      dblclick    : 'doubleClick',
      mousemove   : 'mouseMove',
      focusin     : 'focusIn',
      focusout    : 'focusOut',
      mouseenter  : 'mouseEnter',
      mouseleave  : 'mouseLeave',
      change      : 'change'
    };

    for (event in events) {
      if (events.hasOwnProperty(event)) {
        this.setupHandler(event, events[event]);
      }
    }
  },

  /**
    @private

    Registers an event listener on the document. If the given event is
    triggered, the provided event handler will be triggered on the target
    view.

    If the target view does not implement the event handler, or if the handler
    returns false, the parent view will be called. The event will continue to
    bubble to each successive parent view until it reaches the top.

    For example, to have the `mouseDown` method called on the target view when
    a `mousedown` event is received from the browser, do the following:

        setupHandler('mousedown', 'mouseDown');

    @param {String} event the browser-originated event to listen to
    @param {String} eventName the name of the method to call on the view
  */
  setupHandler: function(event, eventName) {
    var rootElement = this.get('rootElement');

    SC.$(rootElement).delegate('.sc-view', event + '.sproutcore', function(evt) {
      var view = SC.View.views[this.id],
          result = true, handler;

      SC.run(function() {
        while (result !== false && view) {
          handler = view[eventName];
          if (SC.typeOf(handler) === SC.T_FUNCTION) {
            result = handler.call(view, evt);
          }

          view = view.get('parentView');
        }
      });

      return result;
    });
  },

  /** @private */
  destroy: function() {
    var rootElement = this.get('rootElement');

    SC.$(rootElement).undelegate('.sproutcore');
  }
});
