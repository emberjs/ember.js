// ==========================================================================
// Project:   SproutCore
// Copyright: @2013 7x7 Software, Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
sc_require('views/container');


SC.mixin(SC.ContainerView,
/** @scope SC.ContainerView */ {
  /** @class
    Provides push transitions to SC.ContainerView.  The new content will push
    the old content out of the view.

    To modify the push animation, you can set the following transition options:

      - direction {String} the direction to push new content in.  Default: 'left'
        ** 'left' - pushes new content from the right to the left
        ** 'right' - pushes new content from the left to the right
        ** 'up' - pushes new content from the bottom to the top
        ** 'down' - pushes new content from the top to the bottom
      - duration {Number} the number of seconds for the animation.  Default: 0.4
      - timing {String} the animation timing function.  Default: 'ease'

    @extends SC.ViewTransitionProtocol
    @see SC.View#animate for other timing functions.
    @since Version 1.10
  */
  PUSH: {

    /** @private */
    willBuildInToView: function (container, content, previousStatechart, options) {
      var adjustLeft = 0,
        adjustTop = 0,
        frame = container.get('frame'),
        left = 0,
        top = 0,
        height,
        width;

      height = frame.height;
      width = frame.width;

      // Push on to the edge of whatever the current position of previous content is.
      if (previousStatechart && previousStatechart.get('content')) {
        var adjustments = previousStatechart.getPath('content.liveAdjustments');

        adjustLeft = adjustments.left || 0;
        adjustTop = adjustments.top || 0;
      }

      switch (options.direction) {
      case 'right':
        left = -width + adjustLeft;
        break;
      case 'up':
        top = height + adjustTop;
        break;
      case 'down':
        top = -height + adjustTop;
        break;
      default:
        left = width + adjustLeft;
      }

      // Convert to an animatable layout.
      content.adjust({ bottom: null, right: null, left: left, top: top, height: height, width: width });
    },

    /** @private */
    buildInToView: function (statechart, container, content, previousStatechart, options) {
      var key;

      switch (options.direction) {
      case 'up':
        key = 'top';
        break;
      case 'down':
        key = 'top';
        break;
      default:
        key = 'left';
      }

      content.animate(key, 0, {
        duration: options.duration || 0.4,
        timing: options.timing || 'ease'
      }, function (data) {
        // We may already be in exiting state by the time we transition in.
        if (statechart.get('state') === 'entering') {
          statechart.entered();
        }
      });
    },

    /** @private */
    didBuildInToView: function (container, content, options) {
      // Convert to a flexible layout.
      content.adjust({ bottom: 0, right: 0, height: null, width: null });
    },

    /** @private */
    willBuildOutFromView: function (container, content, options) {
      var frame = container.get('frame'),
        height,
        width;

      height = frame.height;
      width = frame.width;

      // Convert to an animatable layout.
      content.adjust({ bottom: null, right: null, height: height, width: width });
    },

    /** @private */
    buildOutFromView: function (statechart, container, content, options, exitCount) {
      var frame = container.get('frame'),
        key,
        value;

      switch (options.direction) {
      case 'right':
        key = 'left';
        value = frame.width;
        break;
      case 'up':
        key = 'top';
        value = -frame.height;
        break;
      case 'down':
        key = 'top';
        value = frame.height;
        break;
      default:
        key = 'left';
        value = -frame.width;
      }

      content.animate(key, value * exitCount, {
        duration: options.duration || 0.4,
        timing: options.timing || 'ease'
      }, function (data) {
        if (!data.isCancelled) {
          statechart.exited();
        }
      });
    },

    /** @private */
    didBuildOutFromView: function (container, content, options) {
      // Convert to a flexible layout.
      content.adjust({ bottom: 0, right: 0, height: null, width: null });
    },

    /** @private */
    transitionClippingFrame: function (container, clippingFrame, options) {
      var frame = container.get('frame');

      switch (options.direction) {
      case 'right':
        clippingFrame.width = frame.width * 2;
        clippingFrame.x = -frame.width;
        break;
      case 'up':
        clippingFrame.height = frame.height * 2;
        clippingFrame.y = -frame.height;
        break;
      case 'down':
        clippingFrame.height = frame.height * 2;
        clippingFrame.y = 0;
        break;
      default:
        clippingFrame.width = frame.width * 2;
        clippingFrame.x = 0;
      }

      return clippingFrame;
    }
  }

});
