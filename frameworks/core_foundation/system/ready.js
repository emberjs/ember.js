// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


SC.BENCHMARK_LOG_READY = YES;

sc_require('system/event');

SC.mixin({
  isReady: NO,

  /**
    Allows apps to avoid automatically attach the ready handlers if they
    want to by setting this flag to YES

    @type Boolean
  */
  suppressOnReady: SC.suppressOnReady ? YES : NO,

  /**
    Allows apps to avoid automatically invoking main() when onReady is called

    @type Boolean
  */
  suppressMain: SC.suppressMain ? YES : NO,

  /**
    Add the passed target and method to the queue of methods to invoke when
    the document is ready.  These methods will be called after the document
    has loaded and parsed, but before the main() function is called.

    Methods are called in the order they are added.

    If you add a ready handler when the main document is already ready, then
    your handler will be called immediately.

    @param target {Object} optional target object
    @param method {Function} method name or function to execute
    @returns {SC}
  */
  ready: function (target, method) {
    var queue = SC._readyQueue;

    // normalize
    if (method === undefined) {
      method = target;
      target = null;
    } else if (SC.typeOf(method) === SC.T_STRING) {
      method = target[method];
    }

    if (SC.isReady) {
      jQuery(document).ready(function () { method.call(target); });
    } else {
      if (!queue) SC._readyQueue = [];
      SC._readyQueue.push(function () { method.call(target); });
    }

    return this;
  },

  onReady: {
    done: function () {
      if (SC.isReady) return;

      SC.isReady = true;

      SC.RunLoop.begin();

      SC.Locale.createCurrentLocale();
      var loc = SC.Locale.currentLanguage.toLowerCase();
      jQuery("body").addClass(loc);

      jQuery("html").attr("lang", loc);

      jQuery("#loading").remove();

      var queue = SC._readyQueue, idx, len;

      if (queue) {
        for (idx = 0, len = queue.length; idx < len; idx++) {
          queue[idx].call();
        }
        SC._readyQueue = null;
      }

      if (window.main && !SC.suppressMain && (SC.mode === SC.APP_MODE)) { window.main(); }
      SC.RunLoop.end();
    }
  }

});

// let apps ignore the regular onReady handling if they need to
if (!SC.suppressOnReady) {
  $(document).ready(SC.onReady.done);
}

// default to app mode.  When loading unit tests, this will run in test mode
SC.APP_MODE = "APP_MODE";
SC.TEST_MODE = "TEST_MODE";
SC.mode = SC.APP_MODE;
