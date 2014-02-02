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
  BOUNCE_IN: {

    /** @private */
    setup: function (view, options, inPlace) {
      var parentView = view.get('parentView'),
        parentFrame,
        viewFrame = view.get('borderFrame'),
        left,
        top;


      if (inPlace) {
        // Move from the current position.
      } else {
        // If there is no parentView, use the window's frame.
        if (parentView) {
          parentFrame = parentView.get('borderFrame');
        } else {
          parentFrame = SC.RootResponder.responder.currentWindowSize;
        }

        switch (options.direction) {
        case 'left':
          left = parentFrame.width;
          break;
        case 'up':
          top = parentFrame.height;
          break;
        case 'down':
          top = -viewFrame.height;
          break;
        default:
          left = -viewFrame.width;
        }
      }

      view.adjust({ centerX: null, centerY: null, bottom: null, left: left || viewFrame.x, right: null, top: top || viewFrame.y, height: viewFrame.height, width: viewFrame.width });
    },

    /** @private */
    run: function (view, options, finalLayout, finalFrame) {
      var layout = view.get('layout'),
        bounciness = options.bounciness || 0.25,
        bounce,
        duration,
        frames,
        finalValue,
        value, bounce1, bounce2;

      switch (options.direction) {
      case 'left':
        finalValue = finalFrame.x;
        value = { left: finalValue };
        bounce = -(finalValue - layout.left) * bounciness;
        bounce1 = { left: finalValue + bounce };
        bounce2 = { left: finalValue + (bounce * 0.5) };
        break;
      case 'up':
        finalValue = finalFrame.y;
        value = { top: finalValue };
        bounce = -(finalValue - layout.top) * bounciness;
        bounce1 = { top: finalValue + bounce };
        bounce2 = { top: finalValue + (bounce * 0.5) };
        break;
      case 'down':
        finalValue = finalFrame.y;
        value = { top: finalValue };
        bounce = (layout.top - finalValue) * bounciness;
        bounce1 = { top: finalValue + bounce };
        bounce2 = { top: finalValue + (bounce * 0.5) };
        break;
      default:
        finalValue = finalFrame.x;
        value = { left: finalValue };
        bounce = (layout.left - finalValue) * bounciness;
        bounce1 = { left: finalValue + bounce };
        bounce2 = { left: finalValue + (bounce * 0.5) };
      }

      // Split the duration evenly per frame.
      duration = options.duration || 0.4;
      duration = duration * 0.2;

      // Define the frames.
      frames = [
        { value: value, duration: duration, timing: 'ease-in' },
        { value: bounce1, duration: duration, timing: 'ease-out' },
        { value: value, duration: duration, timing: 'ease-in' },
        { value: bounce2, duration: duration, timing: 'ease-out' },
        { value: value, duration: duration, timing: 'ease-in-out' }
      ];

      var callback = function (data) {
        if (!data.isCancelled) {
          view.didTransitionIn();
        }
      };

      // Animate through the frames.
      view._animateFrames(frames, callback, options.delay || 0);
    }
  },


  /** @class

    @extends SC.ViewTransitionProtocol
    @since Version 1.10
  */
  BOUNCE_OUT: {

    /** @private */
    setup: function (view, options) {
      var viewFrame = view.get('borderFrame'),
        left = viewFrame.x,
        top = viewFrame.y,
        height = viewFrame.height,
        width = viewFrame.width;

      view.adjust({ centerX: null, centerY: null, bottom: null, left: left, right: null, top: top, height: height, width: width });
    },

    /** @private */
    run: function (view, options, finalLayout, finalFrame) {
      var bounciness = options.bounciness || 0.25,
        bounce,
        bounceValue,
        bounceValue2,
        duration,
        finalValue,
        frames,
        layout = view.get('layout'),
        viewFrame = view.get('borderFrame'),
        parentView = view.get('parentView'),
        parentFrame,
        startValue;

      // If there is no parentView, use the window's frame.
      if (parentView) {
        parentFrame = parentView.get('borderFrame');
      } else {
        parentFrame = SC.RootResponder.responder.currentWindowSize;
      }

      switch (options.direction) {
      case 'left':
        startValue = { left: layout.left };
        finalValue = { left: -viewFrame.width };
        bounce = (layout.left + viewFrame.width) * bounciness;
        bounceValue = { left: layout.left - (bounce * 0.5) };
        bounceValue2 = { left: layout.left - bounce };
        break;
      case 'up':
        startValue = { top: layout.top };
        finalValue = { top: -viewFrame.height };
        bounce = (layout.top + viewFrame.height) * bounciness;
        bounceValue = { top: layout.top - (bounce * 0.5) };
        bounceValue2 = { top: layout.top - bounce };
        break;
      case 'down':
        startValue = { top: layout.top };
        finalValue = { top: parentFrame.height };
        bounce = (parentFrame.height - layout.top) * bounciness;
        bounceValue = { top: layout.top + (bounce * 0.5) };
        bounceValue2 = { top: layout.top + bounce };
        break;
      default:
        startValue = { left: layout.left };
        finalValue = { left: parentFrame.width };
        bounce = (parentFrame.width - layout.left) * bounciness;
        bounceValue = { left: layout.left + (bounce * 0.5) };
        bounceValue2 = { left: layout.left + bounce };
      }

      // Split the duration evenly per frame.
      duration = options.duration || 0.6;
      duration = duration * 0.2;

      // Define the frames.
      frames = [
        { value: bounceValue, duration: duration, timing: 'ease-out' },
        { value: startValue, duration: duration, timing: 'ease-in' },
        { value: bounceValue2, duration: duration, timing: 'ease-out' },
        { value: startValue, duration: duration, timing: 'ease-in-out' },
        { value: finalValue, duration: duration, timing: 'ease-in' }
      ];

      var callback = function (data) {
        if (!data.isCancelled) {
          view.didTransitionOut();
        }
      };

      // Animate through the frames.
      view._animateFrames(frames, callback, options.delay || 0);
    }

  }

});
