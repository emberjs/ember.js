// ==========================================================================
// Project:   SproutCore
// Copyright: @2013 7x7 Software, Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
sc_require('views/container');


SC.mixin(SC.ContainerView,
/** @scope SC.ContainerView */ {

   /** @class
    Provides move in transitions to SC.ContainerView.  The new content will
    move in over top of the old content.

    To modify the move in animation, you can set the following transition
    options:

      - direction {String} the direction to move new content in.  Default: 'left'.
        ** 'left' - moves new content from the right to the left
        ** 'right' - moves new content from the left to the right
        ** 'up' - moves new content from the bottom to the top
        ** 'down' - moves new content from the top to the bottom
      - duration {Number} the number of seconds for the animation.  Default: 0.4
      - timing {String} the animation timing function.  Default: 'ease'

    @extends SC.ViewTransitionProtocol
    @see SC.View#animate for other timing functions.
    @since Version 1.10
  */
  MOVE_IN: {

    /** @private */
    willBuildInToView: function (container, content, previousStatechart, options) {
      var frame = container.get('frame'),
        left,
        top,
        height,
        width;

      height = frame.height;
      width = frame.width;

      switch (options.direction) {
      case 'right':
        left = -width;
        break;
      case 'up':
        top = height;
        break;
      case 'down':
        top = -height;
        break;
      default:
        left = width;
      }

      content.adjust({ bottom: null, left: left || 0, right: null, top: top || 0, height: height, width: width });
    },

    /** @private */
    buildInToView: function (statechart, container, content, previousStatechart, options) {
      var key,
        value;

      switch (options.direction) {
      case 'right':
        key = 'left';
        break;
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
    didBuildOutFromView: function (container, content, options) {
      // Convert to a flexible layout (in case we never fully entered).
      content.adjust({ bottom: 0, right: 0, height: null, width: null });
    },

    /** @private */
    buildOutFromView: function (statechart, container, content, options) {
      // Do nothing.
    }
  }

});
