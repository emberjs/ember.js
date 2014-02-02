// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
sc_require("views/view");
sc_require("views/view/layout_style");

/** @private
  Properties that can be animated
  (Hash for faster lookup)
*/
SC.ANIMATABLE_PROPERTIES = {
  top:     YES,
  left:    YES,
  bottom:  YES,
  right:   YES,
  width:   YES,
  height:  YES,
  centerX: YES,
  centerY: YES,
  opacity: YES,
  scale:   YES,
  rotate:  YES,
  rotateX: YES,
  rotateY: YES,
  rotateZ: YES
};


/**
  States that the view's layout can be set to if its animation is cancelled.

  ### START

  The previous layout of the view before calling animate.

  For example,

      myView.set('layout', { left: 0, top: 0, width: 100, bottom: 0 });
      myView.animate('left', 300, { duration: 1.5 });

      // later..
      myView.cancelAnimation(SC.LayoutState.START);

      myView.get('layout'); // => { left: 0, top: 0, width: 100, bottom: 0 }

  ### CURRENT

  The current layout of the view while it is animating.

  For example,

      myView.set('layout', { left: 0, top: 0, width: 100, bottom: 0 });
      myView.animate('left', 300, { duration: 1.5 });

      // later..
      myView.cancelAnimation(SC.LayoutState.CURRENT);
      myView.get('layout'); // => { left: 150, top: 0, width: 100, bottom: 0 }

  ### END

  The final layout of the view if the animation completed.

  For example,

      myView.set('layout', { left: 0, top: 0, width: 100, bottom: 0 });
      myView.animate('left', 300, { duration: 1.5 });

      // later..
      myView.cancelAnimation(SC.LayoutState.END);
      myView.get('layout'); // => { left: 300, top: 0, width: 100, bottom: 0 }

  @readonly
  @enum {Number}
*/
SC.LayoutState = {
  START: 1,
  CURRENT: 2,
  END: 3
};


SC.View.reopen(
  /** @scope SC.View.prototype */ {

  /* @private Internal variable to store the active (i.e. applied) animations. */
  _activeAnimations: null,

  /* @private Internal variable to store the count of active animations. */
  _activeAnimationsLength: null,

  /* @private Internal variable to store the animation layout until the next run loop when it can be safely applied. */
  _animateLayout: null,

  /* @private Internal variable to store the pending (i.e. not yet applied) animations. */
  _pendingAnimations: null,

  /* @private Internal variable to store the previous layout for in case the animation is cancelled and meant to return to original point. */
  _prevLayout: null,

  /**
    Method protocol.

    The method you provide to SC.View.prototype.animate should accept the
    following parameter(s).

    @name AnimateCallback
    @function
    @param {object} animationResult The result of the animation.
    @param {boolean} animationResult.isCancelled Whether the animation was cancelled or not.
    @param {event} [animationResult.evt] The transitionend event if it exists.
    @param {SC.View} animationResult.view The animated view.
  */

  /**
    Animate a group of layout properties using CSS animations.

    On supported platforms, this will apply the proper CSS transition style
    in order to animate the view to the new layout.  The properties object
    should contain the names of the layout properties to animate with the new
    layout values as values.

    # Options

    To control the transition, you must provide an options object that contains
    at least the duration property and optionally the timing and delay
    properties.  The options properties are as follows:

    - duration: The duration of the transition in seconds.  The default value is 0.25.

    - timing: The transition timing function.  This may be a predefined CSS timing
      function (e.g. 'linear', 'ease', 'ease-in', 'ease-out', 'ease-in-out') or
      it may be an array of values to make a cubic bezier (e.g. [0, 0, 0.58, 1.0]).
      The default value is 'ease'.

      ** 'linear' - Specifies a transition effect with the same speed from start to end (equivalent to cubic-bezier(0,0,1,1))
      ** 'ease' -  Specifies a transition effect with a slow start, then fast, then end slowly (equivalent to cubic-bezier(0.25,0.1,0.25,1))
      ** 'ease-in' - Specifies a transition effect with a slow start (equivalent to cubic-bezier(0.42,0,1,1))
      ** 'ease-out' -  Specifies a transition effect with a slow end (equivalent to cubic-bezier(0,0,0.58,1))
      ** 'ease-in-out' - Specifies a transition effect with a slow start and end (equivalent to cubic-bezier(0.42,0,0.58,1))
      ** 'cubic-bezier(n,n,n,n)' - Define your own values in the cubic-bezier function. Possible values are numeric values from 0 to 1

    - delay: The transition delay in seconds.  The default value is 0.

    For example,

        var myView = SC.View.create({
          layout: { top: 10, left: 10, width: 200, height: 400 }
        });

        MyApp.mainPane.appendChild(myView);

        // The view will animate to the new top & left values.
        myView.animate(
          { top: 200, left: 200 },  // properties
          { duration: 0.75, timing: 'ease-out', delay: 0.5 } // options
        );

    # Callbacks

    To execute code when the transition completes, you may provide an optional
    target and/or method.  When the given group of transitions completes,
    the callback function will be called once and passed an animationResult object with
    properties containing the `event`, the `view` and a boolean `isCancelled` which
    indicates if the animation had been cancelled or not.  The format of the
    target and method follows the standard SproutCore format, where if the
    target is not given then the view itself will be the target.  The
    method can be a function or a property path to look up on the target.

    For example,

        // Passing a function for method.
        myView.animate(
          { top: 200, left: 200 },  // properties
          { duration: 0.75 }, // options
          function (animationResult) {  // method
            // `this` will be myView
          }
        );

        // Passing a target and method.
        myView.animate(
          { scale: 0, opacity: 0 },  // properties
          { duration: 1.5 }, // options
          MyApp.statechart, // target
          'myViewDidShrink' // method
        );

    The animate functions are intelligent in how they apply animations and
    calling animate in a manner that would effect an ongoing animation (i.e.
    animating left again while it is still in transition) will result in
    the ongoing animation callback firing immediately with isCancelled set to
    true and adjusting the transition to accomodate the new settings.

    Note: This may not work if you are not using SproutCore for view layout,
    which means you should not use `animate` if the view has `useStaticLayout`
    set to true.

    ## A note about Hardware Acceleration.

    If a view has a fixed layout (i.e. view.get('isFixedLayout') == true) then
    it will be eligible for hardware accelerated position transitions. Having a
    fixed layout, simply means that the view has a fixed size (width and height)
    and a fixed position (left and top).  If the view is eligible for hardware
    acceleration, it must also set wantsAcceleratedLayer to true for animate to
    use hardware accelerated transitions when animating its position.

    Occassionally, you may wish to animate a view with a non-fixed layout.  To
    do so with hardware acceleration, you should convert the view to a fixed
    layout temporarily and then set it back to a flexible layout after the
    transition is complete.

    For example,

        // Flexible layout.
        myView.set('layout', { left: 0, top: 10, right: 0, bottom: 10 });

        // Prepare to animate by converting to a fixed layout.
        frame = myView.get('frame');
        height = frame.height;
        width = frame.width;
        myView.adjust({ right: null, bottom: null, height: height, width: width });

        // Animate (will be hardware accelerated if myView.get('wantsAcceleratedLayout') is true).
        myView.animate('left', width, { duration: 1 }, function () {
          // Revert back to flexible layout.
          myView.adjust({ right: -width, bottom: 10 });
        });

    @param {Object|String} properties Hash of property names with new layout values or a single property name.
    @param {Number} [value] The new layout value for a single property (only provide if the first parameter is a String).
    @param {Number|Object} Duration or hash of transition options.
    @param {Object} [target=this] The target for the method.
    @param {AnimateCallback|String} [method] The method to run when the transition completes.  May be a function or a property path.
    @returns {SC.View} receiver
  */
  animate: function (key, value, options, target, method) {
    var cur, curAnim,
      valueDidChange = NO,
      optionsDidChange = NO,
      hash, layout,
      optionsType,
      pendingAnimations = this._pendingAnimations,
      timing;

    //@if(debug)
    // Provide a little developer support if they are doing something that may not work.
    if (this.get('useStaticLayout')) {
      SC.warn("Developer Warning: SC.View:animate() was called on a view with useStaticLayout and may not work.  If you are using CSS to layout the view (i.e. useStaticLayout: YES), then you should manage the animation manually.");
    }
    //@endif

    // Normalize arguments
    // TODO: Revisit .animate() arguments re: overloading.
    if (typeof key === SC.T_STRING) {
      hash = {};
      hash[key] = value;
    } else {
      method = target;
      target = options;
      options = value;
      hash = key;
    }

    optionsType = SC.typeOf(options);
    if (optionsType === SC.T_NUMBER) {
      options = { duration: options };
    } else if (optionsType !== SC.T_HASH) {
      throw new Error("Must provide options hash!");
    }

    if (options.callback) {
      method = options.callback;
      delete options.callback;
    }

    // Callback.  We need to keep the callback for each group of animations separate.
    if (method === undefined) {
      method = target;
      target = this;
    }

    // Support `null` being passed in for the target, rather than dropping the argument.
    if (!target) target = this;

    if (method) {
      if (typeof method === "string") method = target[method];
      options.target = target;
      options.method = method;
    }

    // In the case of zero duration, just adjust and call the callback.
    if (options.duration === 0) {
      this.invokeNext(function () {
        this.adjust(hash);
        this.runAnimationCallback(options, null, false);
      });
      return this;
    }

    // In the case that the view is not in the standard visible state, adjust instead of animate.
    if (!this.get('isVisibleInWindow')) {
      this.invokeNext(function () {
        this.adjust(hash);
        this.runAnimationCallback(options, null);
        // Note: we may need to find a way to alert the callback that the animation was successful
        // but instantaneous.
      });
      return this;
    }

    // Timing function
    timing = options.timing;
    if (timing) {
      if (typeof timing !== SC.T_STRING) {
        options.timing = "cubic-bezier(" + timing[0] + ", " + timing[1] + ", " +
                                         timing[2] + ", " + timing[3] + ")";
      } // else leave as is (assume proper CSS timing String)
    } else {
      options.timing = 'ease';
    }

    // Delay
    if (SC.none(options.delay)) { options.delay = 0; }

    // Get the layout (may be a previous layout already animating).
    if (!this._prevLayout) {
      this._prevLayout = SC.clone(this.get('layout'));
    }

    if (!pendingAnimations) { pendingAnimations = this._pendingAnimations = {}; }

    // Get the layout (may be a partially adjusted one already queued up).
    layout = this._animateLayout || SC.clone(this.get('layout'));

    // Handle old style rotation.
    if (!SC.none(hash.rotate)) {
      //@if(debug)
      SC.Logger.warn('Developer Warning: Please animate rotateX instead of rotate.');
      //@endif
      if (SC.none(hash.rotateX)) {
        hash.rotateX = hash.rotate;
      }
      delete hash.rotate;
    }

    // Go through the new animated properties and check for conflicts with
    // previous calls to animate and changes to the current layout.
    for (var property in hash) {
      // Fast path.
      if (!hash.hasOwnProperty(property) || !SC.ANIMATABLE_PROPERTIES[property]) {

        //@if(debug)
        if (!SC.ANIMATABLE_PROPERTIES[property]) {
          SC.warn("Developer Warning: The property `%@` is not animatable using SC.View:animate().".fmt(property));
        }
        //@endif
        continue;
      }

      value = hash[property];
      cur = layout[property];
      curAnim = pendingAnimations[property];

      if (SC.none(value)) { throw new Error("Can only animate to an actual value!"); }

      // If the new adjustment changes the previous adjustment's options before
      // it has rendered, overwrite the previous adjustment.
      if (curAnim && (curAnim.duration !== options.duration ||
          curAnim.timing !== options.timing ||
          curAnim.delay !== options.delay)) {
        optionsDidChange = YES;
        this.runAnimationCallback(curAnim, null, YES);
      }

      if (cur !== value || optionsDidChange) {
        valueDidChange = YES;
        layout[property] = value;

        // Always update the animate hash to the newest options which may have been altered before this was applied.
        pendingAnimations[property] = options;
      }
    }

    // Only animate to new values.
    if (valueDidChange) {
      // When animating height or width with centerX or centerY, we need to animate the margin property also to get a smooth change.
      if (!SC.none(pendingAnimations.height) && !SC.none(layout.centerY) && SC.none(pendingAnimations.centerY)) {
        // Don't animate less than 2px difference b/c the margin-top value won't differ.
        if (Math.abs(hash.height - this.get('layout').height) >= 2) {
          pendingAnimations.centerY = options;
        }
      }

      if (!SC.none(pendingAnimations.width) && !SC.none(layout.centerX) && SC.none(pendingAnimations.centerX)) {
        // Don't animate less than 2px difference b/c the margin-left value won't differ.
        if (Math.abs(hash.width - this.get('layout').width) >= 2) {
          pendingAnimations.centerX = options;
        }
      }

      this._animateLayout = layout;

      // Always run the animation asynchronously so that the original layout is guaranteed to be applied to the DOM.
      this.invokeNext('_animate');

      // Route.
      if (this.get('viewState') === SC.CoreView.ATTACHED_SHOWN) {
        this.set('viewState', SC.CoreView.ATTACHED_SHOWN_ANIMATING);
      }
    } else if (!optionsDidChange) {
      this.invokeNext(function () {
        this.runAnimationCallback(options, null, false);
      });
    }

    return this;
  },

  /** @private */
  _animate: function () {
    // Check for _animateLayout.  If an invokeNext call to animate *this* occurs
    // while flushing the invokeNext queue *before* this method runs, an extra
    // call to _animate will run.  Has unit test.
    var animationLayout = this._animateLayout;
    if (animationLayout) {
      this.willRenderAnimations();

      // Clear the layout cache value first so that it is not present when layout changes next.
      this._animateLayout = null;

      // Apply the animation layout.
      this.set('layout', animationLayout);
    }
  },

  /** @private
    Animates through the given frames.

    @param {Array} frames The array of frame objects.
    @param {AnimateCallback} callback The callback function to call when the final frame is done animating.
    @param {Number} initialDelay The delay before the first frame begins animating.
    @returns {SC.View} receiver
  */
  // TODO: Do this using CSS animations instead.
  _animateFrames: function (frames, callback, initialDelay, count) {
    // Normalize the private argument `count`.
    if (SC.none(count)) { count = 0; }

    var frame = frames[count];

    this.animate(frame.value, {
      delay: initialDelay,
      duration: frame.duration,
      timing: frame.timing
    }, function (data) {
      count += 1;

      // Keep iterating while frames exist and the animations weren't cancelled.
      if (!data.isCancelled && count < frames.length) {
        // Only delay on the first animation.  Increase count to the next frame.
        this._animateFrames(frames, callback, 0, count);
      } else {
        // Done.
        callback(data);
      }
    });

    return this;
  },

  /**
    Cancels the animation, adjusting the view's layout immediately to one of
    three values depending on the `layoutState` parameter.

    If no `layoutState` is given or if SC.LayoutState.END is given, the view
    will be adjusted to its final layout.  If SC.LayoutState.START is given,
    the view will be adjusted back to its initial layout and if
    SC.LayoutState.CURRENT is given, the view will stop at its current layout
    value, which will be some transient value between the start and end values.

    Note: The animation callbacks will be called with the animationResult object's
    isCancelled property set to YES.

    @param {SC.LayoutState} [layoutState=SC.LayoutState.END] The layout to immediately adjust the view to.
    @returns {SC.View} this
  */
  cancelAnimation: function (layoutState) {
    var activeAnimations = this._activeAnimations,
      pendingAnimations = this._pendingAnimations,
      animation,
      key,
      layout,
      didCancel = NO;

    switch (layoutState) {
    case SC.LayoutState.START:
      // Revert back to the start layout.
      layout = this._prevLayout;
      break;
    case SC.LayoutState.CURRENT:
      // Stop at the current layout.
      layout = this.get('liveAdjustments');
      break;
    default:
      layout = this._animateLayout;
    }

    // Route.
    if (this.get('viewState') === SC.CoreView.ATTACHED_SHOWN_ANIMATING) {
      this.set('viewState', SC.CoreView.ATTACHED_SHOWN);
    }

    // Immediately remove the pending animations while calling the callbacks.
    for (key in pendingAnimations) {
      animation = pendingAnimations[key];
      didCancel = YES;

      // Update the animation hash.  Do this first, so callbacks can check for active animations.
      delete pendingAnimations[key];

      // Run the callback.
      this.runAnimationCallback(animation, null, YES);
    }

    // Immediately remove the animation styles while calling the callbacks.
    for (key in activeAnimations) {
      animation = activeAnimations[key];
      didCancel = YES;

      // Update the animation hash.  Do this first, so callbacks can check for active animations.
      delete activeAnimations[key];

      // Remove the animation style without triggering a layout change.
      this.removeAnimationFromLayout(key, YES);

      // Run the callback.
      this.runAnimationCallback(animation, null, YES);
    }

    // Adjust to final position.
    if (didCancel && !!layout) {
      this.adjust(layout);
    }

    // Clean up.
    this._prevLayout = this._activeAnimations = this._pendingAnimations = this._animateLayout = null;

    return this;
  },

  /** @private
    This method is called after the layout style is applied to the layer.  If
    the platform didn't support CSS transitions, the callbacks will be fired
    immediately and the animations removed from the queue.
  */
  didRenderAnimations: function () {
    // Transitions not supported or the document is not visible.
    if (!SC.platform.supportsCSSTransitions || document.hidden) {
      var pendingAnimations = this._pendingAnimations;

      for (var key in pendingAnimations) {
        this.removeAnimationFromLayout(key, NO);
        this.runAnimationCallback(pendingAnimations[key], null, NO);
      }

      // Route.
      if (this.get('viewState') === SC.CoreView.ATTACHED_SHOWN_ANIMATING) {
        this.set('viewState', SC.CoreView.ATTACHED_SHOWN);
      }

      // Reset the placeholder variables now that the layout style has been applied.
      this._activeAnimations = this._pendingAnimations = null;
    }
  },

  /** @private
    Returns the live values of the properties being animated on a view while it
    is animating.  Getting the layout of the view after a call to animate will
    include the final values, some of which will not be the same as what they
    are while the animation is in progress.

    Depending on the property being animated, determining the actual value can
    be quite difficult.  For instance, accelerated views will animate certain
    properties using a browser specific CSS transition on a CSS transform and
    the current value may be a CSSMatrix that needs to be mapped back to a
    regular layout format.

    This property is used by cancelAnimation() to stop the animation in its
    current place.

    PRIVATE - because we may want to rename this function and change its output

    @returns {Object}
  */
  liveAdjustments: function () {
    var activeAnimations = this._activeAnimations,
      jqueryEl = this.$(),
      ret = {},
      transformKey = SC.browser.experimentalCSSNameFor('transform');

    if (activeAnimations) {
      for (var key in activeAnimations) {
        if (key === transformKey) {
          var matrix = jqueryEl.css(key),
            CSSMatrixClass = SC.browser.experimentalNameFor(window, 'CSSMatrix');

          if (CSSMatrixClass !== SC.UNSUPPORTED) {
            matrix = new window[CSSMatrixClass](matrix);

            // Calculate rotateX
            ret.rotateX = Math.atan2(matrix.m32, matrix.m33) * (180 / Math.PI);

            // Calculate rotateY
            ret.rotateY = Math.atan2(-matrix.m31, Math.sqrt(Math.pow(matrix.m32, 2) + Math.pow(matrix.m33, 2))) * (180 / Math.PI);

            // Calculate rotateZ
            ret.rotateZ = -Math.atan2(matrix.m21, matrix.m11) * (180 / Math.PI);

            // Calculate scaleX
            ret.scale = Math.sqrt(Math.pow(matrix.m11, 2) + Math.pow(matrix.m12, 2) + Math.pow(matrix.m13, 2));
            if (matrix.m11 < 0) ret.scale = ret.scale * -1;

            // Retrieve translateX & translateY
            ret.left = matrix.e;
            ret.top = matrix.f;
          } else {
            matrix = matrix.match(/^matrix\((.*)\)$/)[1].split(/,\s*/);
            if (matrix) {
              ret.left = parseInt(matrix[4], 10);
              ret.top = parseInt(matrix[5], 10);
            }
          }
        } else {
          ret[key] = parseInt(jqueryEl.css(key), 10);
        }
      }
    }

    return ret;
  }.property(),

  /** @private Removes the animation CSS from the layer style. */
  removeAnimationFromLayout: function (propertyName, shouldUpdateStyle) {
    var activeAnimations = this._activeAnimations,
      layer = this.get('layer');

    if (!!layer && shouldUpdateStyle) {
      var updatedCSS = [];

      // Calculate the transition CSS that should remain.
      for (var key in activeAnimations) {
        if (key !== propertyName) {
          updatedCSS.push(activeAnimations[key].css);
        }
      }

      layer.style[SC.browser.experimentalStyleNameFor('transition')] = updatedCSS.join(', ');
    }
  },

  /** @deprecated
    Resets animation, stopping all existing animations.
  */
  resetAnimation: function () {
    //@if(debug)
    // Reset gives the connotation that the animation would go back to the start layout, but that is not the case.
    SC.warn('Developer Warning: resetAnimation() has been renamed to cancelAnimation().  Please rename all calls to resetAnimation() with cancelAnimation().');
    //@endif

    return this.cancelAnimation();
  },

  /** @private */
  runAnimationCallback: function (animation, evt, cancelled) {
    var method = animation.method,
      target = animation.target;

    if (method) {
      // We're using invokeNext so we don't trigger any layout changes from
      // the callback until the current layout is updated.
      // this.invokeNext(function () {
        method.call(target, { event: evt, view: this, isCancelled: cancelled });
      // }, this);

      // Always clear the method from the hash to prevent it being called
      // multiple times for animations in the group.
      delete animation.method;
      delete animation.target;
    }
  },

  /** @private
    Called when animation ends, should not usually be called manually
  */
  transitionDidEnd: function (evt) {
    var propertyName = evt.originalEvent.propertyName,
      activeAnimations = this._activeAnimations,
      animation;

    // Fix up the centerX & centerY properties.
    if (propertyName === 'margin-left') { propertyName = 'centerX'; }
    if (propertyName === 'margin-top') { propertyName = 'centerY'; }
    animation = activeAnimations ? activeAnimations[propertyName] : null;

    if (animation) {
      // Update the animation hash.  Do this first, so callbacks can check for active animations.
      delete activeAnimations[propertyName];

      // Remove the animation style without triggering a layout change.
      this.removeAnimationFromLayout(propertyName, YES);

      // Clean up the internal hash.
      this._activeAnimationsLength -= 1;
      if (this._activeAnimationsLength === 0) {
        // Route.
        if (this.get('viewState') === SC.CoreView.ATTACHED_SHOWN_ANIMATING) {
          this.set('viewState', SC.CoreView.ATTACHED_SHOWN);
        }

        this._activeAnimations = this._prevLayout = null;
      }

      // Run the callback.
      this.runAnimationCallback(animation, evt, NO);
    }
  },

  /** @private
   This method is called before the layout style is applied to the layer.  If
   animations have been defined for the view, they will be included in
   this._pendingAnimations.  This method will clear out any conflicts between
   pending and active animations.
   */
  willRenderAnimations: function () {
    // Only apply the style if supported by the platform and the document is visible.
    if (SC.platform.supportsCSSTransitions && !document.hidden) {
      var pendingAnimations = this._pendingAnimations;

      if (pendingAnimations) {
        var activeAnimations = this._activeAnimations;

        if (!activeAnimations) {
          this._activeAnimationsLength = 0;
          activeAnimations = {};
        }

        for (var key in pendingAnimations) {
          if (!pendingAnimations.hasOwnProperty(key)) { continue; }

          var activeAnimation = activeAnimations[key],
            pendingAnimation = pendingAnimations[key];

          if (activeAnimation) {
            this.runAnimationCallback(activeAnimation, null, YES);
          }

          activeAnimations[key] = pendingAnimation;
          this._activeAnimationsLength += 1;
        }

        this._activeAnimations = activeAnimations;
        this._pendingAnimations = null;
      }
    }
  }

});
