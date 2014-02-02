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
  SPRING_IN: {

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
        springiness = options.springiness || 0.25,
        spring,
        duration,
        frames,
        finalValue,
        spring1, spring2, spring3,
        value;

      switch (options.direction) {
      case 'left':
        finalValue = finalFrame.x;
        value = { left: finalValue };
        spring = (layout.left - finalValue) * springiness;
        spring1 = { left: finalValue - spring };
        spring2 = { left: finalValue + (spring * 0.5) };
        spring3 = { left: finalValue - (spring * 0.25) };
        break;
      case 'up':
        finalValue = finalFrame.y;
        value = { top: finalValue };
        spring = (layout.top - finalValue) * springiness;
        spring1 = { top: finalValue - spring };
        spring2 = { top: finalValue + (spring * 0.5) };
        spring3 = { top: finalValue - (spring * 0.25) };
        break;
      case 'down':
        finalValue = finalFrame.y;
        value = { top: finalValue };
        spring = (finalValue - layout.top) * springiness;
        spring1 = { top: finalValue + spring };
        spring2 = { top: finalValue - (spring * 0.5) };
        spring3 = { top: finalValue + (spring * 0.25) };
        break;
      default:
        finalValue = finalFrame.x;
        value = { left: finalValue };
        spring = (finalValue - layout.left) * springiness;
        spring1 = { left: finalValue + spring };
        spring2 = { left: finalValue - (spring * 0.5) };
        spring3 = { left: finalValue + (spring * 0.25) };
      }

      // Split the duration evenly per frame.
      duration = options.duration || 0.4;
      duration = duration * 0.25;

      // Define the frames.
      frames = [
        { value: spring1, duration: duration, timing: 'ease-out' }, // Overshoot.
        { value: spring2, duration: duration, timing: 'ease-in-out' }, // Overshoot back.
        { value: spring3, duration: duration, timing: 'ease-in-out' }, // Overshoot.
        { value: value, duration: duration, timing: 'ease-in-out' } // Hit target.
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
  SPRING_OUT: {

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
      var springiness = options.springiness || 0.25,
        duration,
        finalValue,
        frames,
        layout = view.get('layout'),
        viewFrame = view.get('borderFrame'),
        parentView = view.get('parentView'),
        parentFrame,
        spring,
        spring1, spring2;

      // If there is no parentView, use the window's frame.
      if (parentView) {
        parentFrame = parentView.get('borderFrame');
      } else {
        parentFrame = SC.RootResponder.responder.currentWindowSize;
      }

      switch (options.direction) {
      case 'left':
        finalValue = { left: -viewFrame.width };
        spring = (layout.left + viewFrame.width) * springiness;
        spring1 = { left: layout.left - (spring * 0.5) };
        spring2 = { left: layout.left + spring };
        break;
      case 'up':
        finalValue = { top: -viewFrame.height };
        spring = (layout.top + viewFrame.height) * springiness;
        spring1 = { top: layout.top - (spring * 0.5) };
        spring2 = { top: layout.top + spring };
        break;
      case 'down':
        finalValue = { top: parentFrame.height };
        spring = (parentFrame.height - layout.top) * springiness;
        spring1 = { top: layout.top + (spring * 0.5) };
        spring2 = { top: layout.top - spring };
        break;
      default:
        finalValue = { left: parentFrame.width };
        spring = (parentFrame.width - layout.left) * springiness;
        spring1 = { left: layout.left + (spring * 0.5) };
        spring2 = { left: layout.left - spring };
      }

      // Split the duration evenly per frame.
      duration = options.duration || 0.3;
      duration = duration * 0.33;

      // Define the frames.
      frames = [
        { value: spring1, duration: duration, timing: 'ease-in-out' },
        { value: spring2, duration: duration, timing: 'ease-in-out' },
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
