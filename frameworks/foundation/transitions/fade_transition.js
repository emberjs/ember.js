// ==========================================================================
// Project:   SproutCore
// Copyright: @2013 7x7 Software, Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


SC.mixin(SC.View,
  /** @scope SC.View */ {

  /** @class

    @extends SC.ViewTransitionProtocol
    @see SC.View#animate for other timing functions.
    @since Version 1.10
  */
  FADE_IN: {

    /* @private */
    layoutProperties: ['opacity'],

    /** @private */
    setup: function (view, options, inPlace) {
      view.adjust({ opacity: inPlace ? view.get('layout').opacity || 0 : 0 });
    },

    /** @private */
    run: function (view, options, finalLayout, finalFrame) {
      view.animate('opacity', finalLayout.opacity || 1, {
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
    @see SC.View#animate for other timing functions.
    @since Version 1.10
  */
  FADE_OUT: {

    /* @private */
    layoutProperties: ['opacity'],

    /** @private */
    run: function (view, options) {
      view.animate('opacity', 0, {
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
