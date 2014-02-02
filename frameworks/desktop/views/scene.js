// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/** @class

  Displays several views as scenes that can slide on and off the screen.  The
  scene view is a nice way to provide a simple effect of moving from a
  higher level screen to a more detailed level screen.  You will be able to
  optionally choose the kind of animation used to transition the two scenes
  as well if supported on the web browser.

  # Using SC.SceneView

  To setup the scene view, you should define the 'scenes' property with an
  array of scene names.  These will be the properties on the scene view that
  you can shift in an out of view as needed.  You can edit the scenes property
  at any time.  It will only be used when you start to transition from one
  scene to another.

  Next you should set your nowShowing property to the name of the scene you
  would like to display.  This will cause the view to transition scenes if it
  is visible on screen.  Otherwise, it will simply make the new scene view
  the current content view and that's it.

  @extends SC.ContainerView
  @since Version 1.0
*/
SC.SceneView = SC.ContainerView.extend(
/** @scope SC.SceneView.prototype */ {

  /**
    Array of scene names.  Scenes will slide on and off screen in the order
    that you specify them here.  That is, if you shift from a scene at index
    2 to a scene at index 1, the scenes will animate backwards.  If you
    shift to a scene at index 3, the scenes will animate forwards.

    @type Array
    @default null
  */
  scenes: null,

  /**
    The transitionSwap plugin to use when animating backwards.

    @type Object (SC.SwapTransitionProtocol)
    @default null
    @see SC.ContainerView#transitionSwap
  */
  transitionBackward: SC.ContainerView.PUSH,

  /**
    The options for the given transitionSwap plugin when animating backwards.

    @type Object
    @default { duration: .25, direction: 'right' }
    @see SC.ContainerView#transitionBackwardOptions
  */
  transitionBackwardOptions: { duration: .25, direction: 'right' },

  /**
    The transitionSwap plugin to use when animating forwards.

    @type Object (SC.SwapTransitionProtocol)
    @default null
    @see SC.ContainerView#transitionSwap
  */
  transitionForward: SC.ContainerView.PUSH,

  /**
    The options for the given transitionSwap plugin when animating forwards.

    @type Object
    @default { duration: .25, direction: 'left' }
    @see SC.ContainerView#transitionBackwardOptions
  */
  transitionForwardOptions: { duration: .25, direction: 'left' },

  /** @private
    @param {SC.View} newContent the new content view or null.
    @see SC.ContainerView#replaceContent
  */
  replaceContent: function(newContent) {
    var scenes = this.get('scenes'),
      nowShowing = this.get('nowShowing'),
      outIdx = scenes ? scenes.indexOf(this._lastNowShowingView) : -1,
      inIdx = scenes ? scenes.indexOf(nowShowing) : -1;

    this._lastNowShowingView = nowShowing;

    if (outIdx < inIdx) {
      this.transitionSwap = this.transitionForward;
      this.transitionSwapOptions = this.transitionForwardOptions;
    } else {
      this.transitionSwap = this.transitionBackward;
      this.transitionSwapOptions = this.transitionBackwardOptions;
    }

    sc_super();
  },

});
