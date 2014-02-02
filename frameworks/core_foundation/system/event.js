// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('system/core_query') ;

/**
  The event class provides a simple cross-platform library for capturing and
  delivering events on DOM elements and other objects.  While this library
  is based on code from both jQuery and Prototype.js, it includes a number of
  additional features including support for handler objects and event
  delegation.

  Since native events are implemented very unevenly across browsers,
  SproutCore will convert all native events into a standardized instance of
  this special event class.

  SproutCore events implement the standard W3C event API as well as some
  additional helper methods.

  @constructor
  @param {Event} originalEvent
  @returns {SC.Event} event instance

  @since SproutCore 1.0
*/
SC.Event = function(originalEvent) {
  var idx, len;
  // copy properties from original event, if passed in.
  if (originalEvent) {
    this.originalEvent = originalEvent ;
    var props = SC.Event._props, key;
    len = props.length;
    idx = len;
    while(--idx >= 0) {
      key = props[idx] ;
      this[key] = originalEvent[key] ;
    }
  }

  // Fix timeStamp
  this.timeStamp = this.timeStamp || Date.now();

  // Fix target property, if necessary
  // Fixes #1925 where srcElement might not be defined either
  if (!this.target) this.target = this.srcElement || document;

  // check if target is a textnode (safari)
  if (this.target.nodeType === 3 ) this.target = this.target.parentNode;

  // Add relatedTarget, if necessary
  if (!this.relatedTarget && this.fromElement) {
    this.relatedTarget = (this.fromElement === this.target) ? this.toElement : this.fromElement;
  }

  // Calculate pageX/Y if missing and clientX/Y available
  if (SC.none(this.pageX) && !SC.none(this.clientX)) {
    var doc = document.documentElement, body = document.body;
    this.pageX = this.clientX + (doc && doc.scrollLeft || body && body.scrollLeft || 0) - (doc.clientLeft || 0);
    this.pageY = this.clientY + (doc && doc.scrollTop || body && body.scrollTop || 0) - (doc.clientTop || 0);
  }

  // Add which for key events
  if (!this.which && ((this.charCode || originalEvent.charCode === 0) ? this.charCode : this.keyCode)) {
    this.which = this.charCode || this.keyCode;
  }

  // Add metaKey to non-Mac browsers (use ctrl for PC's and Meta for Macs)
  if (!this.metaKey && this.ctrlKey) this.metaKey = this.ctrlKey;

  // Add which for click: 1 == left; 2 == middle; 3 == right
  // Note: button is not normalized, so don't use it
  if (!this.which && this.button) {
    this.which = ((this.button & 1) ? 1 : ((this.button & 2) ? 3 : ( (this.button & 4) ? 2 : 0 ) ));
  }

  // Normalize wheel delta values for mousewheel events
  if (this.type === 'mousewheel' || this.type === 'DOMMouseScroll' || this.type === 'MozMousePixelScroll') {
    var deltaMultiplier = SC.Event.MOUSE_WHEEL_MULTIPLIER;

    // normalize wheelDelta, wheelDeltaX, & wheelDeltaY for Safari
    if (SC.browser.isWebkit && originalEvent.wheelDelta !== undefined) {
      this.wheelDelta = 0-(originalEvent.wheelDeltaY || originalEvent.wheelDeltaX);
      this.wheelDeltaY = 0-(originalEvent.wheelDeltaY||0);
      this.wheelDeltaX = 0-(originalEvent.wheelDeltaX||0);

    // normalize wheelDelta for Firefox (all Mozilla browsers)
    // note that we multiple the delta on FF to make it's acceleration more
    // natural.
    } else if (!SC.none(originalEvent.detail) && SC.browser.isMozilla) {
      if (originalEvent.axis && (originalEvent.axis === originalEvent.HORIZONTAL_AXIS)) {
        this.wheelDeltaX = originalEvent.detail;
        this.wheelDeltaY = this.wheelDelta = 0;
      } else {
        this.wheelDeltaY = this.wheelDelta = originalEvent.detail ;
        this.wheelDeltaX = 0 ;
      }

    // handle all other legacy browser
    } else {
      this.wheelDelta = this.wheelDeltaY = SC.browser.isIE || SC.browser.isOpera ? 0-originalEvent.wheelDelta : originalEvent.wheelDelta ;
      this.wheelDeltaX = 0 ;
    }

    this.wheelDelta *= deltaMultiplier;
    this.wheelDeltaX *= deltaMultiplier;
    this.wheelDeltaY *= deltaMultiplier;
  }

  return this;
} ;

SC.mixin(SC.Event, /** @scope SC.Event */ {

  /**
    We need this because some browsers deliver different values
    for mouse wheel deltas. Once the first mouse wheel event has
    been run, this value will get set.

    @field
    @type Number
    @default 1
  */
  MOUSE_WHEEL_MULTIPLIER: function() {
    var deltaMultiplier = 1,
        version = SC.browser.engineVersion;

    if (SC.browser.name === SC.BROWSER.safari) {
      deltaMultiplier = 0.4;
      // Safari 5.0.1 and up
      if (SC.browser.compare(version, '533.17') > 0 && SC.browser.compare(version, '534') < 0) {
        deltaMultiplier = 0.004;
      } else if (SC.browser.compare(version, '533') < 0) {
        // Scrolling in Safari 5.0
        deltaMultiplier = 40;
      }
    }else if(SC.browser.name === SC.BROWSER.ie){
      deltaMultiplier = 0.3;
    }else if(SC.browser.name === SC.BROWSER.chrome){
      deltaMultiplier = 0.4;
    }
    return deltaMultiplier;
  }(),

  /**
    This represents the limit in the delta before a different multiplier
    will be applied. Because we can't generated an accurate mouse
    wheel event ahead of time, and browsers deliver differing values
    for mouse wheel deltas, this is necessary to ensure that
    browsers that scale their values largely are dealt with correctly
    in the future.

    @type Number
    @default 1000
  */
  MOUSE_WHEEL_DELTA_LIMIT: 1000,

  /** @private
    We only want to invalidate once
  */
  _MOUSE_WHEEL_LIMIT_INVALIDATED: NO,

  /**
    Standard method to create a new event.  Pass the native browser event you
    wish to wrap if needed.
  */
  create: function(e) { return new SC.Event(e); },

  // the code below was borrowed from jQuery, Dean Edwards, and Prototype.js

  /**
    Bind an event to an element.

    This method will cause the passed handler to be executed whenever a
    relevant event occurs on the named element.  This method supports a
    variety of handler types, depending on the kind of support you need.

    ## Simple Function Handlers

        SC.Event.add(anElement, "click", myClickHandler) ;

    The most basic type of handler you can pass is a function.  This function
    will be executed every time an event of the type you specify occurs on the
    named element.  You can optionally pass an additional context object which
    will be included on the event in the event.data property.

    When your handler function is called the, the function's "this" property
    will point to the element the event occurred on.

    The click handler for this method must have a method signature like:

        function(event) { return YES|NO; }

    ## Method Invocations

        SC.Event.add(anElement, "click", myObject, myObject.aMethod) ;

    Optionally you can specify a target object and a method on the object to
    be invoked when the event occurs.  This will invoke the method function
    with the target object you pass as "this".  The method should have a
    signature like:

        function(event, targetElement) { return YES|NO; }

    Like function handlers, you can pass an additional context data paramater
    that will be included on the event in the event.data property.

    ## Handler Return Values

    Both handler functions should return YES if you want the event to
    continue to propagate and NO if you want it to stop.  Returning NO will
    both stop bubbling of the event and will prevent any default action
    taken by the browser.  You can also control these two behaviors separately
    by calling the stopPropagation() or preventDefault() methods on the event
    itself, returning YES from your method.

    ## Limitations

    Although SproutCore's event implementation is based on jQuery, it is
    much simpler in design.  Notably, it does not support namespaced events
    and you can only pass a single type at a time.

    If you need more advanced event handling, consider the SC.ClassicResponder
    functionality provided by SproutCore or use your favorite DOM library.

    @param {Element} elem a DOM element, window, or document object
    @param {String} eventType the event type you want to respond to
    @param {Object} target The target object for a method call or a function.
    @param {Object} method optional method or method name if target passed
    @param {Object} context optional context to pass to the handler as event.data
    @returns {Object} receiver
  */
  add: function(elem, eventType, target, method, context, useCapture) {

    // if a CQ object is passed in, either call add on each item in the
    // matched set, or simply get the first element and use that.
    if (elem && elem.isCoreQuery) {
      if (elem.length > 0) {
        elem.forEach(function(e) {
          this.add(e, eventType, target, method, context);
        }, this);
        return this;
      } else elem = elem[0];
    }
    if (!elem) return this; // nothing to do

		if (!useCapture) {
			useCapture = NO;
		}

    // cannot register events on text nodes, etc.
    if ( elem.nodeType === 3 || elem.nodeType === 8 ) return SC.Event;

    // For whatever reason, IE has trouble passing the window object
    // around, causing it to be cloned in the process
    if (SC.browser.name === SC.BROWSER.ie && elem.setInterval) elem = window;

    // if target is a function, treat it as the method, with optional context
    if (SC.typeOf(target) === SC.T_FUNCTION) {
      context = method; method = target; target = null;

    // handle case where passed method is a key on the target.
    } else if (target && SC.typeOf(method) === SC.T_STRING) {
      method = target[method] ;
    }

    // Get the handlers queue for this element/eventType.  If the queue does
    // not exist yet, create it and also setup the shared listener for this
    // eventType.
    var events = SC.data(elem, "sc_events") || SC.data(elem, "sc_events", {}) ,
        handlers = events[eventType];
    if (!handlers) {
      handlers = events[eventType] = {} ;
      this._addEventListener(elem, eventType, useCapture) ;
    }

    // Build the handler array and add to queue
    handlers[SC.hashFor(target, method)] = [target, method, context];
    SC.Event._global[eventType] = YES ; // optimization for global triggers

    // Nullify elem to prevent memory leaks in IE
    elem = events = handlers = null ;
    return this ;
  },

  /**
    Removes a specific handler or all handlers for an event or event+type.

    To remove a specific handler, you must pass in the same function or the
    same target and method as you passed into SC.Event.add().  See that method
    for full documentation on the parameters you can pass in.

    If you omit a specific handler but provide both an element and eventType,
    then all handlers for that element will be removed.  If you provide only
    and element, then all handlers for all events on that element will be
    removed.

    ## Limitations

    Although SproutCore's event implementation is based on jQuery, it is
    much simpler in design.  Notably, it does not support namespaced events
    and you can only pass a single type at a time.

    If you need more advanced event handling, consider the SC.ClassicResponder
    functionality provided by SproutCore or use your favorite DOM library.

    @param {Element} elem a DOM element, window, or document object
    @param {String} eventType the event type to remove
    @param {Object} target The target object for a method call.  Or a function.
    @param {Object} method optional name of method
    @returns {Object} receiver
  */
  remove: function(elem, eventType, target, method) {

    // if a CQ object is passed in, either call add on each item in the
    // matched set, or simply get the first element and use that.
    if (elem && elem.isCoreQuery) {
      if (elem.length > 0) {
        elem.forEach(function(e) {
          this.remove(e, eventType, target, method);
        }, this);
        return this;
      } else elem = elem[0];
    }
    if (!elem) return this; // nothing to do

    // don't do events on text and comment nodes
    if ( elem.nodeType === 3 || elem.nodeType === 8 ) return SC.Event;

    /*
      commenting out this block because
      1. this issue is no longer reproducible in IE7, 8 or 9
      2. this causes undesired behavior if one tries to remove an event from
         an iframe because elem.setInterval is true there.
    */
    // // For whatever reason, IE has trouble passing the window object
    // // around, causing it to be cloned in the process
    // if (SC.browser.name === SC.BROWSER.ie && elem.setInterval) elem = window;

    var handlers, key, events = SC.data(elem, "sc_events") ;
    if (!events) return this ; // nothing to do if no events are registered

    // if no type is provided, remove all types for this element.
    if (eventType === undefined) {
      for(eventType in events) this.remove(elem, eventType) ;

    // otherwise, remove the handler for this specific eventType if found
    } else if (handlers = events[eventType]) {

      var cleanupHandlers = NO ;

      // if a target/method is provided, remove only that one
      if (target || method) {

        // normalize the target/method
        if (SC.typeOf(target) === SC.T_FUNCTION) {
          method = target; target = null ;
        } else if (SC.typeOf(method) === SC.T_STRING) {
          method = target[method] ;
        }

        delete handlers[SC.hashFor(target, method)];

        // check to see if there are handlers left on this event/eventType.
        // if not, then cleanup the handlers.
        key = null ;
        for(key in handlers) break ;
        if (key===null) cleanupHandlers = YES ;

      // otherwise, just cleanup all handlers
      } else cleanupHandlers = YES ;

      // If there are no more handlers left on this event type, remove
      // eventType hash from queue.
      if (cleanupHandlers) {
        delete events[eventType] ;
        this._removeEventListener(elem, eventType) ;
      }

      // verify that there are still events registered on this element.  If
      // there aren't, cleanup the element completely to avoid memory leaks.
      key = null ;
      for (key in events) break;
      if (!key) {
        SC.removeData(elem, "sc_events") ;
        delete this._elements[SC.guidFor(elem)]; // important to avoid leaks

        // Clean up the cached listener to prevent a memory leak.
        SC.removeData(elem, 'listener');
      }

    }

    elem = events = handlers = null ; // avoid memory leaks
    return this ;
  },

  NO_BUBBLE: ['blur', 'focus', 'change'],

  /**
    Generates a simulated event object.  This is mostly useful for unit
    testing.  You can pass the return value of this property into the
    trigger() method to actually send the event.

    @param {Element} elem the element the event targets
    @param {String} eventType event type.  mousedown, mouseup, etc
    @param {Hash} attrs optional additional attributes to apply to event.
    @returns {Hash} simulated event object
  */
  simulateEvent: function(elem, eventType, attrs) {
    var ret = SC.Event.create({
      type: eventType,
      target: elem,
      preventDefault: function(){ this.cancelled = YES; },
      stopPropagation: function(){ this.bubbles = NO; },
      allowDefault: function() { this.hasCustomEventHandling = YES; },
      timeStamp: Date.now(),
      bubbles: (this.NO_BUBBLE.indexOf(eventType)<0),
      cancelled: NO,
      normalized: YES
    });
    if (attrs) SC.mixin(ret, attrs) ;
    return ret ;
  },

  /**
    Trigger an event execution immediately.  You can use this method to
    simulate arbitrary events on arbitrary elements.

    ## Limitations

    Note that although this is based on the jQuery implementation, it is
    much simpler.  Notably namespaced events are not supported and you cannot
    trigger events globally.

    If you need more advanced event handling, consider the SC.Responder
    functionality provided by SproutCore or use your favorite DOM library.

    ## Example

        SC.Event.trigger(view.get('layer'), 'mousedown');

    @param elem {Element} the target element
    @param eventType {String} the event type
    @param args {Array} optional argument or arguments to pass to handler.
    @param donative ??
    @returns {Boolean} Return value of trigger or undefined if not fired
  */
  trigger: function(elem, eventType, args, donative) {

    // if a CQ object is passed in, either call add on each item in the
    // matched set, or simply get the first element and use that.
    if (elem && elem.isCoreQuery) {
      if (elem.length > 0) {
        elem.forEach(function(e) {
          this.trigger(e, eventType, args, donative);
        }, this);
        return this;
      } else elem = elem[0];
    }
    if (!elem) return this; // nothing to do

    // don't do events on text and comment nodes
    if ( elem.nodeType === 3 || elem.nodeType === 8 ) return undefined;

    // Normalize to an array
    args = SC.A(args) ;

    var ret, fn = SC.typeOf(elem[eventType] || null) === SC.T_FUNCTION ,
        event, current, onfoo, isClick;

    // Get the event to pass, creating a fake one if necessary
    event = args[0];
    if (!event || !event.preventDefault) {
      event = this.simulateEvent(elem, eventType) ;
      args.unshift(event) ;
    }

    event.type = eventType ;

    // Trigger the event - bubble if enabled
    current = elem;
    do {
      ret = SC.Event.handle.apply(current, args);
      current = (current===document) ? null : (current.parentNode || document);
    } while(!ret && event.bubbles && current);
    current = null ;

    // Handle triggering native .onfoo handlers
    onfoo = elem["on" + eventType] ;
    isClick = SC.$.nodeName(elem, 'a') && eventType === 'click';
    if ((!fn || isClick) && onfoo && onfoo.apply(elem, args) === NO) ret = NO;

    // Trigger the native events (except for clicks on links)
    if (fn && donative !== NO && ret !== NO && !isClick) {
      this.triggered = YES;
      try {
        elem[ eventType ]();
      // prevent IE from throwing an error for some hidden elements
      } catch (e) {}
    }

    this.triggered = NO;

    return ret;
  },

  /**
    This method will handle the passed event, finding any registered listeners
    and executing them.  If you have an event you want handled, you can
    manually invoke this method.  This function expects it's "this" value to
    be the element the event occurred on, so you should always call this
    method like:

        SC.Event.handle.call(element, event) ;

    Note that like other parts of this library, the handle function does not
    support namespaces.

    @param event {Event} the event to handle
    @returns {Boolean}
  */
  handle: function(event) {

    // ignore events triggered after window is unloaded or if double-called
    // from within a trigger.
    if ((typeof SC === "undefined") || SC.Event.triggered) return YES ;

    // returned undefined or NO
    var val, ret, namespace, all, handlers, args, key, handler, method, target;

    // normalize event across browsers.  The new event will actually wrap the
    // real event with a normalized API.
    args = SC.A(arguments);
    args[0] = event = SC.Event.normalizeEvent(event || window.event);

    // get the handlers for this event type
    handlers = (SC.data(this, "sc_events") || {})[event.type];
    if (!handlers) return NO ; // nothing to do

    // invoke all handlers
    for (key in handlers ) {
      handler = handlers[key];
      // handler = [target, method, context]
      method = handler[1];

      // Pass in a reference to the handler function itself
      // So that we can later remove it
      event.handler = method;
      event.data = event.context = handler[2];

      target = handler[0] || this;
      ret = method.apply( target, args );

      if (val !== NO) val = ret;

      // if method returned NO, do not continue.  Stop propagation and
      // return default.  Note that we test explicitly for NO since
      // if the handler returns no specific value, we do not want to stop.
      if ( ret === NO ) {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    return val;
  },

  /**
    This method is called just before the window unloads to unhook all
    registered events.
  */
  unload: function() {
    var key, elements = this._elements ;
    for(key in elements) this.remove(elements[key]) ;

    // just in case some book-keeping was screwed up.  avoid memory leaks
    for(key in elements) delete elements[key] ;
    delete this._elements ;
  },

  /**
    This hash contains handlers for special or custom events.  You can add
    your own handlers for custom events here by simply naming the event and
    including a hash with the following properties:

     - setup: this function should setup the handler or return NO
     - teardown: this function should remove the event listener

  */
  special: {

    ready: {
      setup: function() {
        // Make sure the ready event is setup
        SC._bindReady() ;
        return;
      },

      teardown: function() { return; }

    },

    /** @private
        Implement support for mouseenter on browsers other than IE */
    mouseenter: {
      setup: function() {
        if ( SC.browser.name === SC.BROWSER.ie ) return NO;
        SC.Event.add(this, 'mouseover', SC.Event.special.mouseenter.handler);
        return YES;
      },

      teardown: function() {
        if ( SC.browser.name === SC.BROWSER.ie ) return NO;
        SC.Event.remove(this, 'mouseover', SC.Event.special.mouseenter.handler);
        return YES;
      },

      handler: function(event) {
        // If we actually just moused on to a sub-element, ignore it
        if ( SC.Event._withinElement(event, this) ) return YES;
        // Execute the right handlers by setting the event type to mouseenter
        event.type = "mouseenter";
        return SC.Event.handle.apply(this, arguments);
      }
    },

    /** @private
        Implement support for mouseleave on browsers other than IE */
    mouseleave: {
      setup: function() {
        if ( SC.browser.name === SC.BROWSER.ie ) return NO;
        SC.Event.add(this, "mouseout", SC.Event.special.mouseleave.handler);
        return YES;
      },

      teardown: function() {
        if ( SC.browser.name === SC.BROWSER.ie ) return NO;
        SC.Event.remove(this, "mouseout", SC.Event.special.mouseleave.handler);
        return YES;
      },

      handler: function(event) {
        // If we actually just moused on to a sub-element, ignore it
        if ( SC.Event._withinElement(event, this) ) return YES;
        // Execute the right handlers by setting the event type to mouseleave
        event.type = "mouseleave";
        return SC.Event.handle.apply(this, arguments);
      }
    }
  },

  KEY_BACKSPACE: 8,
  KEY_TAB:       9,
  KEY_RETURN:   13,
  KEY_ESC:      27,
  KEY_SPACE:    32,
  KEY_LEFT:     37,
  KEY_UP:       38,
  KEY_RIGHT:    39,
  KEY_DOWN:     40,
  KEY_DELETE:   46,
  KEY_HOME:     36,
  KEY_END:      35,
  KEY_PAGEUP:   33,
  KEY_PAGEDOWN: 34,
  KEY_INSERT:   45,

  _withinElement: function(event, elem) {
    // Check if mouse(over|out) are still within the same parent element
    var parent = event.relatedTarget;

    // Traverse up the tree
    while ( parent && parent !== elem ) {
      try { parent = parent.parentNode; } catch(error) { parent = elem; }
    }

    // Return YES if we actually just moused on to a sub-element
    return parent === elem;
  },

  /** @private
    Adds the primary event listener for the named type on the element.

    If the event type has a special handler defined in SC.Event.special,
    then that handler will be used.  Otherwise the normal browser method will
    be used.

    @param elem {Element} the target element
    @param eventType {String} the event type
  */
  _addEventListener: function(elem, eventType, useCapture) {
    var listener, special = this.special[eventType] ;

		if (!useCapture) {
			useCapture = NO;
		}

    // Check for a special event handler
    // Only use addEventListener/attachEvent if the special
    // events handler returns NO
    if ( !special || special.setup.call(elem)===NO) {

      // Save element in cache.  This must be removed later to avoid
      // memory leaks.
      var guid = SC.guidFor(elem) ;
      this._elements[guid] = elem;

      // Either retrieve the previously cached listener or cache a new one.
      listener = SC.data(elem, "listener") || SC.data(elem, "listener",
       function() {
         return SC.Event.handle.apply(SC.Event._elements[guid], arguments);
      }) ;

      // Bind the global event handler to the element
      if (elem.addEventListener) {
        elem.addEventListener(eventType, listener, useCapture);
      } else if (elem.attachEvent) {
        // attachEvent is not working for IE8 and xhr objects
        // there is currently a hack in request , but it needs to fixed here.
        elem.attachEvent("on" + eventType, listener);
      }
      //
      // else {
      //         elem.onreadystatechange = listener;
      //       }
    }

    elem = special = listener = null ; // avoid memory leak
  },

  /** @private
    Removes the primary event listener for the named type on the element.

    If the event type has a special handler defined in SC.Event.special,
    then that handler will be used.  Otherwise the normal browser method will
    be used.

    Note that this will not clear the _elements hash from the element.  You
    must call SC.Event.unload() on unload to make sure that is cleared.

    @param elem {Element} the target element
    @param eventType {String} the event type
  */
  _removeEventListener: function(elem, eventType) {
    var listener, special = SC.Event.special[eventType] ;
    if (!special || (special.teardown.call(elem)===NO)) {
      // Retrieve the cached listener.
      listener = SC.data(elem, "listener") ;
      if (listener) {
        if (elem.removeEventListener) {
          elem.removeEventListener(eventType, listener, NO);
        } else if (elem.detachEvent) {
          elem.detachEvent("on" + eventType, listener);
        }
      }
    }

    elem = special = listener = null ;
  },

  _elements: {},

  // implement preventDefault() in a cross platform way

  /** @private Take an incoming event and convert it to a normalized event. */
  normalizeEvent: function(event) {
    if (event === window.event) {
      // IE can't do event.normalized on an Event object
      return SC.Event.create(event) ;
    } else {
      return event.normalized ? event : SC.Event.create(event) ;
    }
  },

  _global: {},

  /** @private properties to copy from native event onto the event */
  _props: "altKey attrChange attrName bubbles button cancelable charCode clientX clientY ctrlKey currentTarget data detail eventPhase fromElement handler keyCode metaKey newValue originalTarget pageX pageY prevValue relatedNode relatedTarget screenX screenY shiftKey srcElement target timeStamp toElement type view which touches targetTouches changedTouches animationName elapsedTime dataTransfer".split(" ")

}) ;

SC.Event.prototype = {

  /**
    Set to YES if you have called either preventDefault() or stopPropagation().
    This allows a generic event handler to notice if you want to provide
    detailed control over how the browser handles the real event.

    @type Boolean
  */
  hasCustomEventHandling: NO,

  /**
    Returns the touches owned by the supplied view.

    @param {SC.View}
    @returns {Array} touches an array of SC.Touch objects
  */
  touchesForView: function(view) {
    if (this.touchContext) return this.touchContext.touchesForView(view);
  },

  /**
    Same as touchesForView, but sounds better for responders.

    @param {SC.RootResponder}
    @returns {Array} touches an array of SC.Touch objects
  */
  touchesForResponder: function(responder) {
    if (this.touchContext) return this.touchContext.touchesForView(responder);
  },

  /**
    Returns average data--x, y, and d (distance)--for the touches owned by the
    supplied view.

    @param {SC.View}
    @returns {Array} touches an array of SC.Touch objects
  */
  averagedTouchesForView: function(view) {
    if (this.touchContext) return this.touchContext.averagedTouchesForView(view);
    return null;
  },

  /**
    Indicates that you want to allow the normal default behavior.  Sets
    the hasCustomEventHandling property to YES but does not cancel the event.

    @returns {SC.Event} receiver
  */
  allowDefault: function() {
    this.hasCustomEventHandling = YES ;
    return this ;
  },

  /**
    Implements W3C standard.  Will prevent the browser from performing its
    default action on this event.

    @returns {SC.Event} receiver
  */
  preventDefault: function() {
    var evt = this.originalEvent ;
    if (evt) {
      if (evt.preventDefault) evt.preventDefault() ;
      else evt.returnValue = NO ; // IE8
    }
    this.hasCustomEventHandling = YES ;
    return this ;
  },

  /**
    Implements W3C standard.  Prevents further bubbling of the event.

    @returns {SC.Event} receiver
  */
  stopPropagation: function() {
    var evt = this.originalEvent ;
    if (evt) {
      if (evt.stopPropagation) evt.stopPropagation() ;
      evt.cancelBubble = YES ; // IE
    }
    this.hasCustomEventHandling = YES ;
    return this ;
  },

  /**
    Stops both the default action and further propagation.  This is more
    convenient than calling both.

    @returns {SC.Event} receiver
  */
  stop: function() {
    return this.preventDefault().stopPropagation();
  },

  /**
    Always YES to indicate the event was normalized.

    @type Boolean
  */
  normalized: YES,

  /**
    Returns the pressed character as a String.

    @returns {String}
  */
  // Warning.
  // Older versions of IE don't support charCode, but on keypress return the
  // ASCII value in keyCode instead of the key code.  Therefore, if this code is
  // used on keyDown in IE versions prior to 9.0, it will fail.
  // Since SproutCore passes the keydown and keypress events as a keyDown
  // method, it's most likely that this code will cause unexpected problems
  // in IE 7 & IE 8.
  //
  // Reference: http://unixpapa.com/js/key.html
  getCharString: function() {
    if(SC.browser.name === SC.BROWSER.ie &&
        SC.browser.compare(SC.browser.version, '9.0') < 0) {
      // Return an empty String for backspace, tab, left, right, up or down.
      if(this.keyCode == 8 || this.keyCode == 9 ||
          (this.keyCode >= 37 && this.keyCode<=40)) {
        return String.fromCharCode(0);
      } else {
        // This will only be accurate if the event is a keypress event.
        return (this.keyCode>0) ? String.fromCharCode(this.keyCode) : null;
      }
    } else {
      return (this.charCode>0) ? String.fromCharCode(this.charCode) : null;
    }
  },

  /**
    Returns character codes for the event.  The first value is the normalized
    code string, with any shift or ctrl characters added to the begining.
    The second value is the char string by itself.

    @returns {Array}
  */
  commandCodes: function() {
    var code=this.keyCode, ret=null, key=null, modifiers='', lowercase ;

    // handle function keys.
    // WebKit browsers have equal values for keyCode and charCode on keypress event
    if (code && code !== this.charCode) {
      ret = SC.FUNCTION_KEYS[code] ;
      if (!ret && (this.altKey || this.ctrlKey || this.metaKey)) {
        ret = SC.PRINTABLE_KEYS[code];
      }

      if (ret) {
        if (this.altKey) modifiers += 'alt_' ;
        if (this.ctrlKey || this.metaKey) modifiers += 'ctrl_' ;
        if (this.shiftKey) modifiers += 'shift_' ;
      }
    }

    // otherwise just go get the right key.
    if (!ret) {
      code = this.which ;
      key = ret = String.fromCharCode(code) ;
      lowercase = ret.toLowerCase() ;
      if (this.metaKey) {
        modifiers = 'meta_' ;
        ret = lowercase;

      } else ret = null ;
    }

    if (ret) ret = modifiers + ret ;
    return [ret, key] ;
  }

} ;

// Also provide a Prototype-like API so that people can use either one.

/** Alias for add() method.  This provides a Prototype-like API. */
SC.Event.observe = SC.Event.add ;

/** Alias for remove() method.  This provides a Prototype-like API */
SC.Event.stopObserving = SC.Event.remove ;

/** Alias for trigger() method.  This provides a Prototype-like API */
SC.Event.fire = SC.Event.trigger;

// Register unload handler to eliminate any registered handlers
// This avoids leaks in IE and issues with mouseout or other handlers on
// other browsers.

if(SC.browser.name === SC.BROWSER.ie) SC.Event.add(window, 'unload', SC.Event.prototype, SC.Event.unload) ;

SC.MODIFIER_KEYS = {
  16:'shift', 17:'ctrl', 18: 'alt'
};

SC.FUNCTION_KEYS = {
  8: 'backspace',  9: 'tab',  13: 'return',  19: 'pause',  27: 'escape',
  33: 'pageup', 34: 'pagedown', 35: 'end', 36: 'home',
  37: 'left', 38: 'up', 39: 'right', 40: 'down', 44: 'printscreen',
  45: 'insert', 46: 'delete', 112: 'f1', 113: 'f2', 114: 'f3', 115: 'f4',
  116: 'f5', 117: 'f7', 119: 'f8', 120: 'f9', 121: 'f10', 122: 'f11',
  123: 'f12', 144: 'numlock', 145: 'scrolllock'
} ;

SC.PRINTABLE_KEYS = {
  32: ' ', 48:"0", 49:"1", 50:"2", 51:"3", 52:"4", 53:"5", 54:"6", 55:"7",
  56:"8", 57:"9", 59:";", 61:"=", 65:"a", 66:"b", 67:"c", 68:"d", 69:"e",
  70:"f", 71:"g", 72:"h", 73:"i", 74:"j", 75:"k", 76:"l", 77:"m", 78:"n",
  79:"o", 80:"p", 81:"q", 82:"r", 83:"s", 84:"t", 85:"u", 86:"v", 87:"w",
  88:"x", 89:"y", 90:"z", 107:"+", 109:"-", 110:".", 188:",", 190:".",
  191:"/", 192:"`", 219:"[", 220:"\\", 221:"]", 222:"\""
} ;
