// ==========================================================================
// Project:   SproutCore
// Copyright: @2013 7x7 Software, Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


SC.mixin(SC.View,
  /** @scope SC.View */ {

  /** @class

    To modify the bounce animation, you may set the following transition
    options in `transitionAdjustOptions`:

      - bounces {Number} the number of bounce back iterations.  Default: 2
      - bounciness {Number} the bounce coefficient.  Default: 0.25
      - duration {Number} the number of seconds for the animation.  Default: 0.4

    @extends SC.ViewTransitionProtocol
    @see SC.View#animate for other timing functions.
    @since Version 1.10
  */
  BOUNCE_ADJUST: {

    /** @private */
    run: function (view, options, finalLayout) {
      var bounces = options.bounces || 2,
        bounciness = options.bounciness || 0.25,
        layout = view.get('layout'),
        frames = [],
        frameCount = (bounces * 2) + 1,
        duration,
        i;

      // Split the duration evenly per frame.
      duration = options.duration || 0.4;
      duration = duration / frameCount;

      // Construct the frame layouts.
      for (i = 0; i < frameCount; i++) {
        if (i % 2) {
          // Bounce back.
          frames[i] = { value: SC.clone(finalLayout), duration: duration, timing: 'ease-out' };
        } else {
          // Hit target.
          if (i === frameCount - 1) {
            frames[i] = { value: SC.clone(finalLayout), duration: duration, timing: 'ease-in-out' };
          } else {
            frames[i] = { value: SC.clone(finalLayout), duration: duration, timing: 'ease-in' };
          }
        }
      }

      // Adjust the bounce frame layouts.
      for (var key in finalLayout) {
        var finalValue = finalLayout[key],
          // The bounce is based on the "distance" to the final value and the bounciness value.
          bounce = Math.round((finalValue - layout[key]) * bounciness);

        // Adjust the layout property for each bounce.
        for (i = 0; i < bounces; i++) {
          // Pull out the bounce frames only.
          frames[(i * 2) + 1].value[key] = finalValue - bounce;

          // Cut back the bounce amount after each bounce
          bounce = Math.round(bounce * 0.5);
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
