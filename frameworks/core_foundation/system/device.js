// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require('system/core_query');
sc_require('system/ready');
sc_require('system/root_responder');
sc_require('system/platform');

SC.PORTRAIT_ORIENTATION = 'portrait';
SC.LANDSCAPE_ORIENTATION = 'landscape';
SC.NO_ORIENTATION = 'desktop'; // value 'desktop' for backwards compatibility

/**
  The device object allows you to check device specific properties such as
  orientation and if the device is offline, as well as observe when they change
  state.

  ## Orientation
  When a touch device changes orientation, the orientation property will be
  set accordingly which you can observe

  ## Offline support
  In order to build a good offline-capable web application, you need to know
  when your app has gone offline so you can for instance queue your server
  requests for a later time or provide a specific UI/message.

  Similarly, you also need to know when your application has returned to an
  'online' state again, so that you can re-synchronize with the server or do
  anything else that might be needed.

  By observing the 'isOffline' property you can be notified when this state
  changes. Note that this property is only connected to the navigator.onLine
  property, which is available on most modern browsers.

*/
SC.device = SC.Object.create({

  /**
    Sets the orientation for devices, either SC.LANDSCAPE_ORIENTATION
    or SC.PORTRAIT_ORIENTATION.

    @type String
    @default SC.PORTRAIT_ORIENTATION
  */
  orientation: SC.PORTRAIT_ORIENTATION,

  /**
    Indicates whether the device is currently online or offline. For browsers
    that do not support this feature, the default value is NO.

    Is currently inverse of the navigator.onLine property. Most modern browsers
    will update this property when switching to or from the browser's Offline
    mode, and when losing/regaining network connectivity.

    @type Boolean
    @default NO
  */
  isOffline: NO,

  /**
    Returns a Point containing the last known X and Y coordinates of the
    mouse, if present.

    @type Point
  */
  mouseLocation: function() {
    var responder = SC.RootResponder.responder,
        lastX = responder._lastMoveX,
        lastY = responder._lastMoveY;

    if (SC.empty(lastX) || SC.empty(lastY)) {
      return null;
    }

    return { x: lastX, y: lastY };
  }.property(),

  /**
    Initialize the object with some properties up front
  */
  init: function() {
    sc_super();

    if (navigator && navigator.onLine === false) {
      this.set('isOffline', YES);
    }
  },

  /**
    As soon as the DOM is up and running, make sure we attach necessary
    event handlers
  */
  setup: function() {
    var responder = SC.RootResponder.responder;
    responder.listenFor(['online', 'offline'], window, this);

    this.orientationHandlingShouldChange();
  },

  // ..........................................................
  // ORIENTATION HANDLING
  //

  /**
    Determines which method to use for orientation changes.
    Either detects orientation changes via the current size
    of the window, or by the window.onorientationchange event.
  */
  orientationHandlingShouldChange: function() {
    if (SC.platform.windowSizeDeterminesOrientation) {
      SC.Event.remove(window, 'orientationchange', this, this.orientationchange);
      this.windowSizeDidChange(SC.RootResponder.responder.get('currentWindowSize'));
    } else if (SC.platform.supportsOrientationChange) {
      SC.Event.add(window, 'orientationchange', this, this.orientationchange);
      this.orientationchange();
    }
  },

  /**
    @param {Hash} newSize The new size of the window
    @returns YES if the method altered the orientation, NO otherwise
  */
  windowSizeDidChange: function(newSize) {
    if (SC.platform.windowSizeDeterminesOrientation) {
      if (newSize.height >= newSize.width) {
        SC.device.set('orientation', SC.PORTRAIT_ORIENTATION);
      } else {
        SC.device.set('orientation', SC.LANDSCAPE_ORIENTATION);
      }

      return YES;
    }
    return NO;
  },

  /**
    Called when the window.onorientationchange event is fired.
  */
  orientationchange: function(evt) {
    SC.run(function() {
      if (window.orientation === 0 || window.orientation === 180) {
        SC.device.set('orientation', SC.PORTRAIT_ORIENTATION);
      } else {
        SC.device.set('orientation', SC.LANDSCAPE_ORIENTATION);
      }
    });
  },

  /** @private */
  orientationObserver: function () {
    var body = SC.$(document.body),
        orientation = this.get('orientation');

    if (orientation === SC.PORTRAIT_ORIENTATION) {
      body.addClass('sc-portrait');
    } else {
      body.removeClass('sc-portrait');
    }

    if (orientation === SC.LANDSCAPE_ORIENTATION) {
      body.addClass('sc-landscape');
    } else {
      body.removeClass('sc-landscape');
    }
  }.observes('orientation'),


  // ..........................................................
  // CONNECTION HANDLING
  //

  online: function(evt) {
    this.set('isOffline', NO);
  },

  offline: function(evt) {
    this.set('isOffline', YES);
  }

});

/*
  Invoked when the document is ready, but before main is called.  Creates
  an instance and sets up event listeners as needed.
*/
SC.ready(function() {
  SC.device.setup();
});
