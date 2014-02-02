// ==========================================================================
// Project:   SproutCore
// Copyright: @2013 7x7 Software, Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


SC.mixin(SC.View,
  /** @scope SC.View */ {

  /** @class

    To modify the spring animation, you may set the following transition
    options in `transitionAdjustOptions`:

      - springs {Number} the number of spring back iterations.  Default: 4
      - springiness {Number} the spring coefficient.  Default: 0.25
      - duration {Number} the number of seconds for the animation.  Default: 0.4

    @extends SC.ViewTransitionProtocol
    @see SC.View#animate for other timing functions.
    @since Version 1.10
  */
  SPRING_ADJUST: {

    /** @private */
    run: function (view, options, finalLayout) {
      var springs = options.springs || 4,
        springiness = options.springiness || 0.25,
        layout = view.get('layout'),
        frames = [],
        frameCount = springs + 1,
        duration,
        i;

      // Split the duration evenly per frame.
      duration = options.duration || 0.4;
      duration = duration / frameCount;

      // Construct the frame layouts.
      for (i = 0; i < frameCount; i++) {
        if (i !== 0) {
          frames[i] = { value: SC.clone(finalLayout), duration: duration, timing: 'ease-in-out' };
        } else {
          frames[i] = { value: SC.clone(finalLayout), duration: duration, timing: 'ease-out' };
        }
      }

      // Adjust the spring frame layouts.
      for (var key in finalLayout) {
        var finalValue = finalLayout[key],
          // The spring is based on the "distance" to the final value and the springiness value.
          spring = Math.round((finalValue - layout[key]) * springiness);

        // Adjust the layout property for each spring.
        for (i = 0; i < springs; i++) {
          if (i % 2) {
            frames[i].value[key] = finalValue - spring; // Overshoot back.
          } else {
            frames[i].value[key] = finalValue + spring; // Overshoot forward.
          }

          // Cut back the spring amount after each spring
          spring = Math.round(spring * 0.5);
        }
      }

      var callback = function () {
        view.didTransitionAdjust();
      };

      // Animate through the frames.
      view._animateFrames(frames, callback, options.delay || 0);
    }
  }

});
