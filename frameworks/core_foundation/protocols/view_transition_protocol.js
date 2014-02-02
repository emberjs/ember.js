// ==========================================================================
// Project:   SproutCore
// Copyright: @2013 7x7 Software, Inc.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


/** @namespace
  This protocol defines the allowable transition plugin methods.

  SC.View uses transition plugins to setup, execute and cleanup the
  swapping between views and expects the given transition plugin object
  to implement the methods in this protocol.
*/
SC.ViewTransitionProtocol = {

  /**
    This optional method is called to set up the entrance transition (i.e.
    transitionIn or transitionShow).

    Use this method to adjust the layout of the view so that it may be properly
    animated.  For example, you may need to adjust the content from a flexible
    layout (i.e. { left: 0, top: 0, right: 0, bottom: 0 }) to a fixed layout
    (i.e. { left: 0, top: 0, width: 100, height: 200 }) so that it can be
    moved.

    @param {SC.View} view The view being transitioned.
    @param {Object} options Options to modify the transition.  As set by transitionShowOptions or transitionInOptions.
    @param {Boolean} inPlace Whether the transition should start with the current layout of the view, because a previous transition was cancelled in place.
  */
  setup: function (view, options, inPlace) {},

  /**
    This method is called to transition the view in or visible (i.e.
    transitionIn or transitionShow).

    When the transition completes, this function *must* call `didTransitionIn()`
    on the view, passing this object and the original options as
    arguments.

    @param {SC.View} view The view being transitioned.
    @param {Object} options Options to modify the transition.  As set by transitionShowOptions or transitionInOptions.
    @param {Object} finalLayout The final layout of the view, which may be different than the starting layout of the view if a previous transition was cancelled in place.
    @param {Object} finalFrame The final frame of the view, which may be different than the starting frame of the view if a previous transition was cancelled in place.
  */
  run: function (view, options, finalLayout, finalFrame) {},


  /**
    This optional property exposes a list of layout properties involved in the
    transition. This allows the view to more intelligently reset its layout when
    the transition is complete.

    If unspecified, the transition will cache and reset the entire layout hash. This
    can cause problems when spearately adjusting or animating those properties during
    a transition. (Note that you should not adjust or animate the layout properties
    that are involved in a transition while the transition is under way.)

    @field
    @type Array
    @default All layout properties
  */
  layoutProperties: []

};
