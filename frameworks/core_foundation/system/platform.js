// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
/*global jQuery*/

/**
  A constant indicating an unsupported method, property or other.

  @static
  @constant
*/
SC.UNSUPPORTED = '_sc_unsupported';


/** @class

  This platform object allows you to conditionally support certain HTML5
  features.

  Rather than relying on the user agent, it detects whether the given elements
  and events are supported by the browser, allowing you to create much more
  robust apps.
*/
SC.platform = SC.Object.create({
  /**
    The size of scrollbars in this browser.

    @type Number
  */
  scrollbarSize: function () {
    var tester = document.createElement("DIV"),
        child;
    tester.innerHTML = "<div style='height:1px;'></div>";
    tester.style.cssText = "position:absolute;width:100px;height:100px;overflow-y:visible;";

    child = tester.childNodes[0];
    document.body.appendChild(tester);
    var noScroller = child.innerWidth || child.clientWidth;
    tester.style.overflowY = 'scroll';
    var withScroller = child.innerWidth || child.clientWidth;
    document.body.removeChild(tester);

    return noScroller - withScroller;

  }.property().cacheable(),


  /*
    NOTES
     - Chrome would incorrectly indicate support for touch events.  This has been fixed:
       http://code.google.com/p/chromium/issues/detail?id=36415
     - Android is assumed to support touch, but incorrectly reports that it does not.
     - See: https://github.com/Modernizr/Modernizr/issues/84 for a discussion on detecting
       touch capability.
     - See: https://github.com/highslide-software/highcharts.com/issues/1331 for a discussion
       about why we need to check if ontouchstart is null in addition to check if it's defined
     - The test for window._phantom provides support for phantomjs, the headless WebKit browser
       used in Travis-CI, and which incorredtly (see above) identifies itself as a touch browser.
       For more information on CI see https://github.com/sproutcore/sproutcore/pull/1025
       For discussion of the phantomjs touch issue see https://github.com/ariya/phantomjs/issues/10375
  */
  /**
    YES if the current device supports touch events, NO otherwise.

    You can simulate touch events in environments that don't support them by
    calling SC.platform.simulateTouchEvents() from your browser's console.

    Note! The support for "touch" is a browser property and can't be relied on
    to determine if the device is actually a "touch" device or if the device
    actually uses touch events.  There are instances where "touch" devices will
    not send touch events or will send touch and mouse events together and
    there are instances where "non-touch" devices will support touch events.

    It is recommended that you do not use this property at this time.

    @type Boolean
  */
  touch: (!SC.none(window.ontouchstart) || SC.browser.name === SC.BROWSER.android || 'ontouchstart' in document.documentElement) && SC.none(window._phantom),

  /**
    YES if the current browser supports bounce on scroll.

    @type Boolean
  */
  bounceOnScroll: SC.browser.os === SC.OS.ios,

  /**
    YES if the current browser supports pinch to zoom.

    @type Boolean
  */
  pinchToZoom:  SC.browser.os === SC.OS.ios,

  /**
    A hash that contains properties that indicate support for new HTML5
    input attributes.

    For example, to test to see if the placeholder attribute is supported,
    you would verify that SC.platform.input.placeholder is YES.

    @type Array
  */
  input: function (attributes) {
    var ret = {},
        len = attributes.length,
        elem = document.createElement('input'),
        attr, idx;

    for (idx = 0; idx < len; idx++) {
      attr = attributes[idx];

      ret[attr] = !!(attr in elem);
    }

    return ret;
  }(['autocomplete', 'readonly', 'list', 'size', 'required', 'multiple', 'maxlength',
        'pattern', 'min', 'max', 'step', 'placeholder',
        'selectionStart', 'selectionEnd', 'selectionDirection']),

  /**
    YES if the application is currently running as a standalone application.

    For example, if the user has saved your web application to their home
    screen on an iPhone OS-based device, this property will be true.

    @type Boolean
  */
  standalone: !!navigator.standalone,


  /** @deprecated Since version 1.10. Use SC.browser.cssPrefix.
    Prefix for browser specific CSS attributes.
  */
  cssPrefix: SC.browser.cssPrefix,

  /** @deprecated Since version 1.10. Use SC.browser.domPrefix.
    Prefix for browser specific CSS attributes when used in the DOM.
  */
  domCSSPrefix: SC.browser.domPrefix,

  /**
    Call this method to swap out the default mouse handlers with proxy methods
    that will translate mouse events to touch events.

    This is useful if you are debugging touch functionality on the desktop.
  */
  simulateTouchEvents: function () {
    // Touch events are supported natively, no need for this.
    if (this.touch) {
      // @if (debug)
      SC.Logger.info("Can't simulate touch events in an environment that supports them.");
      // @endif
      return;
    }

    SC.Logger.log("Simulating touch events");

    // Tell the app that we now "speak" touch
    SC.platform.touch = YES;
    SC.platform.bounceOnScroll = YES;

    // CSS selectors may depend on the touch class name being present
    document.body.className = document.body.className + ' touch';

    // Initialize a counter, which we will use to generate unique ids for each
    // fake touch.
    this._simtouch_counter = 1;

    // Remove events that don't exist in touch environments
    this.removeEvents(['click', 'dblclick', 'mouseout', 'mouseover', 'mousewheel']);

    // Replace mouse events with our translation methods
    this.replaceEvent('mousemove', this._simtouch_mousemove);
    this.replaceEvent('mousedown', this._simtouch_mousedown);
    this.replaceEvent('mouseup', this._simtouch_mouseup);

    // fix orientation handling
    SC.platform.windowSizeDeterminesOrientation = YES;
    SC.device.orientationHandlingShouldChange();
  },

  /** @private
    Removes event listeners from the document.

    @param {Array} events Array of strings representing the events to remove
  */
  removeEvents: function (events) {
    var idx, len = events.length, key;
    for (idx = 0; idx < len; idx++) {
      key = events[idx];
      SC.Event.remove(document, key, SC.RootResponder.responder, SC.RootResponder.responder[key]);
    }
  },

  /** @private
    Replaces an event listener with another.

    @param {String} evt The event to replace
    @param {Function} replacement The method that should be called instead
  */
  replaceEvent: function (evt, replacement) {
    SC.Event.remove(document, evt, SC.RootResponder.responder, SC.RootResponder.responder[evt]);
    SC.Event.add(document, evt, this, replacement);
  },

  /** @private
    When simulating touch events, this method is called when mousemove events
    are received.

    If the altKey is depressed and pinch center not yet established, we will capture the mouse position.
  */
  _simtouch_mousemove: function (evt) {
    if (!this._mousedown) {
      /*
        we need to capture when was the first spot that the altKey was pressed and use it as
        the center point of a pinch
       */
      if (evt.altKey && this._pinchCenter === null) {
        this._pinchCenter = {
          pageX: evt.pageX,
          pageY: evt.pageY,
          screenX: evt.screenX,
          screenY: evt.screenY,
          clientX: evt.clientX,
          clientY: evt.clientY
        };
      } else if (!evt.altKey && this._pinchCenter !== null) {
        this._pinchCenter = null;
      }
      return NO;
    }

    var manufacturedEvt = this.manufactureTouchEvent(evt, 'touchmove');
    return SC.RootResponder.responder.touchmove(manufacturedEvt);
  },

  /** @private
    When simulating touch events, this method is called when mousedown events
    are received.
  */
  _simtouch_mousedown: function (evt) {
    this._mousedown = YES;

    var manufacturedEvt = this.manufactureTouchEvent(evt, 'touchstart');
    return SC.RootResponder.responder.touchstart(manufacturedEvt);
  },

  /** @private
    When simulating touch events, this method is called when mouseup events
    are received.
  */
  _simtouch_mouseup: function (evt) {
    var manufacturedEvt = this.manufactureTouchEvent(evt, 'touchend'),
        ret = SC.RootResponder.responder.touchend(manufacturedEvt);

    this._mousedown = NO;
    this._simtouch_counter++;
    return ret;
  },

  /** @private
    Converts a mouse-style event to a touch-style event.

    Note that this method edits the passed event in place, and returns
    that same instance instead of a new, modified version.

    If altKey is depressed and we have previously captured a position for the center of
    the pivot point for the virtual second touch, we will manufacture an additional touch.
    The position of the virtual touch will be the reflection of the mouse position,
    relative to the pinch center.

    @param {Event} evt the mouse event to modify
    @param {String} type the type of event (e.g., touchstart)
    @returns {Event} the mouse event with an added changedTouches array
  */
  manufactureTouchEvent: function (evt, type) {
    var realTouch, virtualTouch, realTouchIdentifier = this._simtouch_counter;

    realTouch = {
      type: type,
      target: evt.target,
      identifier: realTouchIdentifier,
      pageX: evt.pageX,
      pageY: evt.pageY,
      screenX: evt.screenX,
      screenY: evt.screenY,
      clientX: evt.clientX,
      clientY: evt.clientY
    };
    evt.touches = [ realTouch ];

    /*
      simulate pinch gesture
     */
    if (evt.altKey && this._pinchCenter !== null) {
      //calculate the mirror position of the virtual touch
      var pageX = this._pinchCenter.pageX + this._pinchCenter.pageX - evt.pageX,
          pageY = this._pinchCenter.pageY + this._pinchCenter.pageY - evt.pageY,
          screenX = this._pinchCenter.screenX + this._pinchCenter.screenX - evt.screenX,
          screenY = this._pinchCenter.screenY + this._pinchCenter.screenY - evt.screenY,
          clientX = this._pinchCenter.clientX + this._pinchCenter.clientX - evt.clientX,
          clientY = this._pinchCenter.clientY + this._pinchCenter.clientY - evt.clientY,
          virtualTouchIdentifier = this._simtouch_counter + 1;

      virtualTouch = {
        type: type,
        target: evt.target,
        identifier: virtualTouchIdentifier,
        pageX: pageX,
        pageY: pageY,
        screenX: screenX,
        screenY: screenY,
        clientX: clientX,
        clientY: clientY
      };

      evt.touches = [realTouch, virtualTouch];
    }
    evt.changedTouches = evt.touches;

    return evt;
  },

  /**
    Whether the browser supports CSS animations.

    @type Boolean
  */
  supportsCSSAnimations: SC.browser.experimentalStyleNameFor('animation') !== SC.UNSUPPORTED,

  /**
    Whether the browser supports CSS transitions.

    @type Boolean
  */
  supportsCSSTransitions: SC.browser.experimentalStyleNameFor('transition') !== SC.UNSUPPORTED,

  /**
    Whether the browser supports 2D CSS transforms.

    @type Boolean
  */
  supportsCSSTransforms: SC.browser.experimentalStyleNameFor('transform') !== SC.UNSUPPORTED,

  /**
    Whether the browser can properly handle 3D CSS transforms.

    @type Boolean
  */
  supportsCSS3DTransforms: SC.browser.experimentalStyleNameFor('perspective') !== SC.UNSUPPORTED,

  /**
    Whether the browser supports the application cache.

    @type Boolean
  */
  supportsApplicationCache: ('applicationCache' in window),

  /**
    Whether the browser supports the hashchange event.

    @type Boolean
  */
  supportsHashChange: function () {
    // Code copied from Modernizr which copied code from YUI (MIT licenses)
    // documentMode logic from YUI to filter out IE8 Compat Mode which false positives
    return ('onhashchange' in window) && (document.documentMode === undefined || document.documentMode > 7);
  }(),

  /**
    Whether the browser supports HTML5 history.

    @type Boolean
  */
  supportsHistory: function () {
    return !!(window.history && window.history.pushState);
  }(),

  /**
    Whether the browser supports IndexedDB.

    @type Boolean
  */
  supportsIndexedDB: function () {
    return !!(window.indexedDB || window[SC.browser.domPrefix + 'IndexedDB']);
  }(),

  /**
    Whether the browser supports the canvas element.

    @type Boolean
  */
  supportsCanvas: function () {
    return !!document.createElement('canvas').getContext;
  }(),

  /**
    Whether the browser supports the orientationchange event.

    @type Boolean
  */
  supportsOrientationChange: ('onorientationchange' in window),

  /**
    Whether the browser supports WebSQL.

    @type Boolean
  */
  supportsWebSQL: ('openDatabase' in window),

  /**
    Because iOS is slow to dispatch the window.onorientationchange event,
    we use the window size to determine the orientation on iOS devices
    and desktop environments when SC.platform.touch is YES (ie. when
    SC.platform.simulateTouchEvents has been called)

    @type Boolean
  */
  windowSizeDeterminesOrientation: SC.browser.os === SC.OS.ios || !('onorientationchange' in window),

  /**
    Does this browser support the Apache Cordova (formerly phonegap) runtime?

    This requires that you (the engineer) manually include the cordova
    javascript library for the appropriate platform (Android, iOS, etc)
    in your code. There are various methods of doing this; creating your own
    platform-specific index.rhtml is probably the easiest option.

    WARNING: Using the javascript_libs Buildfile option for the cordova include
    will NOT work. The library will be included after your application code,
    by which time this property will already have been evaluated.

    @type Boolean
    @see http://incubator.apache.org/cordova/
  */
  // Check for the global cordova property.
  cordova: (typeof window.cordova !== "undefined")

});

/** @private
  Test the transition and animation event names of this platform.  We could hard
  code event names into the framework, but at some point things would change and
  we would get it wrong.  Instead we perform actual tests to find out the proper
  names and only add the proper listeners.

  Once the tests are completed the RootResponder is notified in order to clean up
  unnecessary transition and animation event listeners.
*/
SC.ready(function () {
  // This will add 4 different variations of the named event listener and clean
  // them up again.
  // Note: we pass in capitalizedEventName, because we can't just capitalize
  // the standard event name.  For example, in WebKit the standard transitionend
  // event is named webkitTransitionEnd, not webkitTransitionend.
  var executeTest = function (el, standardEventName, capitalizedEventName, cleanUpFunc) {
    var domPrefix = SC.browser.domPrefix,
      lowerDomPrefix = domPrefix.toLowerCase(),
      eventNameKey = standardEventName + 'EventName',
      callback = function (evt) {
        var domPrefix = SC.browser.domPrefix,
          lowerDomPrefix = domPrefix.toLowerCase(),
          eventNameKey = standardEventName + 'EventName';

        // Remove all the event listeners.
        el.removeEventListener(standardEventName, callback, NO);
        el.removeEventListener(lowerDomPrefix + standardEventName, callback, NO);
        el.removeEventListener(lowerDomPrefix + capitalizedEventName, callback, NO);
        el.removeEventListener(domPrefix + capitalizedEventName, callback, NO);

        // The cleanup timer re-uses this function and doesn't pass evt.
        if (evt) {
          SC.platform[eventNameKey] = evt.type;

          // Don't allow the event to bubble, because SC.RootResponder will be
          // adding event listeners as soon as the testing is complete.  It is
          // important that SC.RootResponder's listeners don't catch the last
          // test event.
          evt.stopPropagation();
        }

        // Call the clean up function, pass in success state.
        if (cleanUpFunc) { cleanUpFunc(!!evt); }
      };

    // Set the initial value as unsupported.
    SC.platform[eventNameKey] = SC.UNSUPPORTED;

    // Try the various implementations.
    // ex. transitionend, webkittransitionend, webkitTransitionEnd, WebkitTransitionEnd
    el.addEventListener(standardEventName, callback, NO);
    el.addEventListener(lowerDomPrefix + standardEventName, callback, NO);
    el.addEventListener(lowerDomPrefix + capitalizedEventName, callback, NO);
    el.addEventListener(domPrefix + capitalizedEventName, callback, NO);
  };

  // Set up and execute the transition event test.
  if (SC.platform.supportsCSSTransitions) {
    var transitionEl = document.createElement('div'),
      transitionStyleName = SC.browser.experimentalStyleNameFor('transition', 'all 1ms linear');

    transitionEl.style[transitionStyleName] = 'all 1ms linear';

    // Test transition events.
    executeTest(transitionEl, 'transitionend', 'TransitionEnd', function (success) {
      // If an end event never fired, we can't really support CSS transitions in SproutCore.
      if (success) {
        // Set up the SC transition event listener.
        SC.RootResponder.responder.cleanUpTransitionListeners();
      } else {
        SC.platform.supportsCSSTransitions = NO;
      }

      transitionEl.parentNode.removeChild(transitionEl);
      transitionEl = null;
    });

    // Append the test element.
    document.documentElement.appendChild(transitionEl);

    // Break execution to allow the browser to update the DOM before altering the style.
    setTimeout(function () {
      transitionEl.style.opacity = '0';
    });

    // Set up and execute the animation event test.
    if (SC.platform.supportsCSSAnimations) {
      var animationEl = document.createElement('div'),
        keyframes,
        prefixedKeyframes;

      // Generate both the regular and prefixed version of the style.
      keyframes = '@keyframes _sc_animation_test { from { opacity: 1; } to { opacity: 0; } }';
      prefixedKeyframes = '@' + SC.browser.cssPrefix + 'keyframes _sc_prefixed_animation_test { from { opacity: 1; } to { opacity: 0; } }';

      // Add test animation styles.
      animationEl.innerHTML = '<style>' + keyframes + '\n' + prefixedKeyframes + '</style>';

      // Set up and execute the animation event test.
      animationEl.style.animation = '_sc_animation_test 1ms linear';
      animationEl.style[SC.browser.domPrefix + 'Animation'] = '_sc_prefixed_animation_test 5ms linear';

      // NOTE: We could test start, but it's extra work and easier just to test the end
      // and infer the start event name from it.  Keeping this code for example.
      // executeTest(animationEl, 'animationstart', 'AnimationStart', function (success) {
      //   // If an iteration start never fired, we can't really support CSS transitions in SproutCore.
      //   if (!success) {
      //     SC.platform.supportsCSSAnimations = NO;
      //   }
      // });

      // NOTE: Testing iteration event support proves very problematic.  Many
      // browsers can't iterate less than several milliseconds which means we
      // have to wait too long to find out this event name.  Instead we test
      // the end only and infer the iteration event name from it. Keeping this
      // code for example, but it wont' work reliably unless the animation style
      // is something like '_sc_animation_test 30ms linear' (i.e. ~60ms wait time)
      // executeTest(animationEl, 'animationiteration', 'AnimationIteration', function (success) {
      //   // If an iteration event never fired, we can't really support CSS transitions in SproutCore.
      //   if (!success) {
      //     SC.platform.supportsCSSAnimations = NO;
      //   }
      // });

      // Test animation events.
      executeTest(animationEl, 'animationend', 'AnimationEnd', function (success) {
        // If an end event never fired, we can't really support CSS animations in SproutCore.
        if (success) {
          // Infer the start and iteration event names based on the success of the end event.
          var domPrefix = SC.browser.domPrefix,
            lowerDomPrefix = domPrefix.toLowerCase(),
            endEventName = SC.platform.animationendEventName;

          switch (endEventName) {
          case lowerDomPrefix + 'animationend':
            SC.platform.animationstartEventName = lowerDomPrefix + 'animationstart';
            SC.platform.animationiterationEventName = lowerDomPrefix + 'animationiteration';
            break;
          case lowerDomPrefix + 'AnimationEnd':
            SC.platform.animationstartEventName = lowerDomPrefix + 'AnimationStart';
            SC.platform.animationiterationEventName = lowerDomPrefix + 'AnimationIteration';
            break;
          case domPrefix + 'AnimationEnd':
            SC.platform.animationstartEventName = domPrefix + 'AnimationStart';
            SC.platform.animationiterationEventName = domPrefix + 'AnimationIteration';
            break;
          default:
            SC.platform.animationstartEventName = 'animationstart';
            SC.platform.animationiterationEventName = 'animationiteration';
          }

          // Set up the SC animation event listeners.
          SC.RootResponder.responder.cleanUpAnimationListeners();
        } else {
          SC.platform.supportsCSSAnimations = NO;
        }

        // Clean up.
        animationEl.parentNode.removeChild(animationEl);
        animationEl = null;
      });

      // Break execution to allow the browser to update the DOM before altering the style.
      document.documentElement.appendChild(animationEl);
    }
  }
});
