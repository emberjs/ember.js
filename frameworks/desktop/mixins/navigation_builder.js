// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================


/**
  @namespace
  NavigationBuilder is an implementation of the Builder protocol. It implements
  `buildIn`/`Out` (though these only relay to `buildIn`/`OutNavigation, so feel free to
  override if needed; the navigation builders will still be accessible).
  
  Building in and out animates the view in and out to and from the left and right.
*/
SC.NavigationBuilder = {

  /**
    Walk like a duck.
    
    @type Boolean
    @default YES
    @constant
  */
  isNavigationBuilder: YES,
  
  /**
    The transitions to be used for navigation; these are mixed in to the existing
    transitions hash if one exists, or become the transitions hash otherwise.
    
    If NO, it uses the (hard-coded) defaults.
    
    @type Boolean
    @default NO
  */
  navigationTransitions: NO,
  
  initMixin: function() {
    // force integrate SC.Animatable
    var animatable = SC.Animatable;
    if (animatable && !this.isAnimatable) {
      // okay, let's mix it in!
      this.mixin(animatable);
    } else if (!animatable) { 
      // check that we actually have SC.Animatable
      SC.Logger.error(
        "SC.NavigationView and SC.NavigationBuilder require SC.Animatable " + 
        "to perform animations, but it is not present. Please ensure your app or framework " +
        "references it."
      );
    }
    
    var navigationTransitions = this.get("navigationTransitions");
    if (!navigationTransitions && SC.Animatable) {
      navigationTransitions = {
        // these being identical helps us.
        left: { duration: 0.25, timing: SC.Animatable.TRANSITION_EASE_IN_OUT, action: "navigationBuildDidFinish" },
        transform: { duration: 0.25, timing: SC.Animatable.TRANSITION_EASE_IN_OUT, action: "navigationBuildDidFinish" }
      };
    }
    
    // mix in transitions (a base set will have been added by SC.Animatable alrady)
    if (SC.Animatable) SC.mixin(this.transitions, navigationTransitions);
  },
  
  /** @private
    Determines metrics of the view. This may be adapted to work with non-CSS transforms in future...
  */
  metrics: function() {
    var f = this.computeFrameWithParentFrame();
    return f;
  },
  
  /** @private
    Applies the supplied CSS transform.
  */
  transform: function(pos) {
    if (SC.platform.supportsCSS3DTransforms) {
      this.adjust("transform", "translate3d(" + pos + "px,0px,0px)");
    } else {
      this.adjust("transform", "translate(" + pos + "px,0px)");
    }
  },
  
  buildInNavigation: function() {
    // set initial state
    var metrics = this.metrics();
    this.disableAnimation();
    this.transform(this.get("buildDirection") === SC.TO_LEFT ? metrics.width : -metrics.width);
    this.enableAnimation();
    
    // now, (delayed) call transform to go to the correct spot
    this.invokeLater("transform", 10, 0);
  },
  
  buildOutNavigation: function() {
    // we already have an initial state
    var metrics = this.metrics();
    this.transform(this.get("buildDirection") === SC.TO_LEFT ? -metrics.width : metrics.width);
  },
  
  /**
    You may override this. If you do, call `buildInNavigation` to call the original functionality.
    You may need to override `navigationBuildDidFinish` as well if you call `buildInNavigation`.
  */
  buildIn: function() {
    this.buildInNavigation();
  },
  
  /**
    You may override this. If you do, call `buildOutNavigation` to call the original functionality.
    You may need to override `navigationBuildDidFinish`as well if you call `buildOutNavigation`.
  */
  buildOut: function() {
    this.buildOutNavigation();
  },
  
  /**
    This ensures that the view has a CSS transform set, even if it is added without build in, etc.
  */
  resetBuild: function() {
    this.transform(0);
  },
  
  /**
    Called when the transitions finish.
  */
  navigationBuildDidFinish: function() {
    if (this.isBuildingIn) {
      this.buildInDidFinish();
    } else if (this.isBuildingOut) {
      this.buildOutDidFinish();
    }
  }
  
} ;

