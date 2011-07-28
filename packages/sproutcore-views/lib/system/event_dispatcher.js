// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var get = SC.get, set = SC.set, fmt = SC.String.fmt;

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
  setup: function(addedEvents) {
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
      submit      : 'submit',
      change      : 'change'
    };

    jQuery.extend(events, addedEvents || {});

    var rootElement = SC.$(get(this, 'rootElement'));

    sc_assert(fmt('You cannot use the same root element (%@) multiple times in an SC.Application', [rootElement.selector || rootElement[0].tagName]), !rootElement.is('.sc-application'));
    sc_assert('You cannot make a new SC.Application using a root element that is a descendent of an existing SC.Application', !rootElement.closest('.sc-application').length);
    sc_assert('You cannot make a new SC.Application using a root element that is an ancestor of an existing SC.Application', !rootElement.find('.sc-application').length);

    rootElement.addClass('sc-application')

    for (event in events) {
      if (events.hasOwnProperty(event)) {
        this.setupHandler(rootElement, event, events[event]);
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
  setupHandler: function(rootElement, event, eventName) {
    var self = this;

    rootElement.delegate('.sc-view', event + '.sproutcore', function(evt, triggeringManager) {

      var view = SC.View.views[this.id],
          result = true, manager = null;

      manager = self._findNearestEventManager(view,eventName);

      if (manager && manager !== triggeringManager) {
        result = self._dispatchEvent(manager, evt, eventName, view);
      } else if (view) {
        result = self._bubbleEvent(view,evt,eventName);
      } else {
        evt.stopPropagation();
      }

      return result;
    });
  },

  /** @private */
  _findNearestEventManager: function(view, eventName) {
    var manager = null;

    while (view) {
      manager = get(view, 'eventManager');
      if (manager && manager[eventName]) { break; }

      view = get(view, 'parentView');
    }

    return manager;
  },

  /** @private */
  _dispatchEvent: function(object, evt, eventName, view) {
    var result = true;

    handler = object[eventName];
    if (SC.typeOf(handler) === 'function') {
      result = handler.call(object, evt, view);
      evt.stopPropagation();
    }
    else {
      result = this._bubbleEvent(view, evt, eventName);
    }

    return result;
  },

  /** @private */
  _bubbleEvent: function(view, evt, eventName) {
    var result = true, handler,
        self = this;

      SC.run(function() {
        handler = view[eventName];
        if (SC.typeOf(handler) === 'function') {
          result = handler.call(view, evt);
        }
      });

    return result;
  },

  /** @private */
  destroy: function() {
    var rootElement = get(this, 'rootElement');
    SC.$(rootElement).undelegate('.sproutcore').removeClass('sc-application');
    return this._super();
  }
});
