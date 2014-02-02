// ==========================================================================
// Project:   SproutCore
// Copyright: @2013 7x7 Software, Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


SC.mixin(SC.View,
  /** @scope SC.View */ {

  /** @class

    @extends SC.ViewTransitionProtocol
    @since Version 1.10
  */
  SCALE_IN: {

    /* @private */
    layoutProperties: ['scale'],

    /** @private */
    setup: function (view, options, inPlace) {
      view.adjust({ scale: inPlace ? view.get('layout').scale || 0 : 0 });
    },

    /** @private */
    run: function (view, options, finalLayout, finalFrame) {
      view.animate('scale', finalLayout.scale || 1, {
        delay: options.delay || 0,
        duration: options.duration || 0.4,
        timing: options.timing || 'ease'
      }, function (data) {
        if (!data.isCancelled) {
          this.didTransitionIn();
        }
      });
    }
  },

  /** @class

    @extends SC.ViewTransitionProtocol
    @since Version 1.10
  */
  SCALE_OUT: {

    /* @private */
    layoutProperties: ['scale'],

    /** @private */
    run: function (view, options) {
      view.animate('scale', 0, {
        delay: options.delay || 0,
        duration: options.duration || 0.4,
        timing: options.timing || 'ease'
      }, function (data) {
        if (!data.isCancelled) {
          this.didTransitionOut();
        }
      });
    }

  }
});
