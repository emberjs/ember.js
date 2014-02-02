// ==========================================================================
// Project:   SproutCore
// Copyright: @2013 7x7 Software, Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


SC.mixin(SC.View,
  /** @scope SC.View */ {

  /** @class

    To modify the smooth animation, you may set the following transition
    options in `transitionAdjustOptions`:

      - duration {Number} the number of seconds for the animation.  Default: 0.4

    @extends SC.ViewTransitionProtocol
    @see SC.View#animate for other timing functions.
    @since Version 1.10
  */
  SMOOTH_ADJUST: {

    /** @private */
    run: function (view, options, finalLayout) {
      var key,
        value;

      view.animate(finalLayout, {
        delay: options.delay || 0,
        duration: options.duration || 0.4,
        timing: options.timing || 'ease'
      }, function (data) {
        this.didTransitionAdjust();
      });
    }
  }

});
