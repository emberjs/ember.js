// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

sc_require("views/toolbar");

/** @class
  NavigationBars do Great Things. They transition themselves (fade in/out) and
  all children (swoosh left/right). They accept isSwipeLeft and isSwipeRight views
  that handle, well, swiping. In short, they are neat.
  
  @extends SC.ToolbarView
  @extends SC.Gesturable
  @since SproutCore 1.0
*/
SC.NavigationBarView = SC.ToolbarView.extend(SC.Gesturable,
/** @scope SC.NavigationBarView.prototype */{

  /** @private */
  init: function() {
    sc_super();
    
    if (!SC.Animatable) {
      SC.Logger.error(
        "NavigationBarView requires SC.Animatable. " +
        "Please make your app or framework require the animation framework. CRASH."
      );
    }
  },

  /** @private */
  mixinAnimatable: function() {
    this.mixin(SC.Animatable);
    this.transitions = this.navigationTransitions;
  },
  
  /**
    The default navigation transitions.
  */
  navigationTransitions: { 
    opacity: {
      duration: 0.25, action: "didFinishTransition"
    } 
  },
  
  /**
    The default style (opacity is 1)
  */
  style: {
    opacity: 1
  },
  

  // ..........................................................
  // Gesture Support
  // 
  
  /** @private */
  gestures: ["swipeGesture"],
  
  /** @private */
  swipeGesture: SC.SwipeGesture,

  /** @private */
  swipe: function(gesture, touch, direction) {
    var lookingFor = (direction === SC.SWIPE_LEFT) ? "isSwipeLeft" : "isSwipeRight",
        cv = this.get("childViews"), 
        child, idx, len = cv.get("length");
    
    // loop through the children
    for (idx = 0; idx < len; idx++) {
      child = cv[idx];
      
      // see if this is the view we are looking for
      if (child.get(lookingFor)) {
        // just give it touch responder and end right away, just like ScrollView. Good times, eh?
        touch.makeTouchResponder(child);
        touch.end();
        return;
      }
    }
    
  },
  
  
  // ..........................................................
  // View Build Support
  // 
  
  /** @private */
  resetBuild: function() {
    if (!this.isAnimatable) this.mixinAnimatable();
  },
  
  /** @private */
  didFinishTransition: function() {
    if (this.isBuildingIn) {
      // and please continue
      this.buildInDidFinish();
    } else if (this.isBuildingOut) this.buildOutDidFinish();
  },
  
  /** @private */
  preBuildIn: function() {
    // first, fade this view out
    this.disableAnimation();
    this.adjust("opacity", 0).updateLayout();
    this.enableAnimation();
    
    // now, loop over child views
    var cv = this.get("childViews"), child, idx, len = cv.get("length");
    for (idx = 0; idx < len; idx++) {
      child = cv[idx];
      
      // if the child disables navigation transitions, skip
      if (child.disableNavigationTransition) continue;
      
      // make sure the navigation stuff is mixed in as needed
      if (!child._nv_mixedIn) this.mixinNavigationChild(child);
      
      // now, set the initial state, which is either to the left or to the right 100px.
      child.disableAnimation();
      child.transform(this.buildDirection === SC.TO_LEFT ? 100  : -100);
      child.enableAnimation();
    }
  },
  
  /** @private */
  buildIn: function() {
    // first, we do the precursor
    this.preBuildIn();
    
    // then, we queue the actual animation
    this.invokeLater("startBuildIn", 10);
  },
  
  /** @private */
  startBuildIn: function() {
    this.adjust("opacity", 1);

    // get our frame, because we use it when computing child frames.
    var cv = this.get("childViews"), child, idx, len = cv.get("length");
    for (idx = 0; idx < len; idx++) {
      child = cv[idx];
      if (child.disableNavigationTransition) continue;
      child.transform(0);
    }
  },

  /** @private */
  buildOut: function() {
    this.adjust("opacity", 0);
    
    var cv = this.get("childViews"), child, idx, len = cv.get("length");
    for (idx = 0; idx < len; idx++) {
      child = cv[idx];
      if (child.disableNavigationTransition) continue;
      if (!child._nv_mixedIn) this.mixinNavigationChild(child);
      child.transform(this.buildDirection === SC.TO_LEFT ? -100  : 100);
    }
  },
  
  /** @private */
  mixinNavigationChild: function(child) {
    if (child.isAnimatable) return;
    
    // mix in animatable
    child.mixin(SC.Animatable);
    
    // mix in the transitions (and the "natural" layout)
    child.mixin({
      transitions: {
        transform: {timing: SC.Animatable.TRANSITION_EASE_IN_OUT, duration: 0.25}
      },
      naturalLayout: child.get("layout"),
      transform: function(pos) {
        if (SC.platform.supportsCSS3DTransforms) {
          this.adjust("transform", "translate3d(" + pos + "px,0px,0px)");
        } else {
          this.adjust("transform", "translate(" + pos + "px,0px)");          
        }
      }
    });
    
    // and mark as having mixed in.
    child._nv_mixedIn = YES;
  }
});