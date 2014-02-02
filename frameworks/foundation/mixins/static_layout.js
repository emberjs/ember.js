// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  @namespace

  SC.StaticLayout is now built in to SC.View.  You do not need to
  apply this mixin to use static layout.  Just set useStaticLayout to YES.



  Normally, SproutCore views use absolute positioning to display themselves
  on the screen.  While this is both the fastest and most efficient way to
  display content in the web browser, sometimes your user interface might need
  to take advantage of the more advanced "flow" layout offered by the browser
  when you use static and relative positioning.

  This mixin can be added to a view class to enable the use of any kind of
  static and relative browser positioning.  In exchange for using static
  layout, you will lose a few features that are normally available on a view
  class such as the 'frame' and 'clippingFrame' properties as well as
  notifications when your view or parentView are resized.

  Normally, if you are allowing the browser to manage the size and positioning
  of your view, these feature will not be useful to your code anyway.

  ## Using StaticLayout

  To enable static layout on your view, just include this mixin on the view.
  SproutCore's builtin views that are capable of being used in static
  layouts already incorporate this mixin.  Then set the "useStaticLayout"
  property on your view class to YES.

  You can then use CSS or the render() method on your view to setup the
  positioning on your view using any browser layout mechanism you want.

  ## Example

      // JavaScript

      MyApp.CommentView = SC.View.extend(SC.StaticLayout, {

        classNames: ['comment-view'],

        useStaticLayout: YES,

        ...
      });

      // CSS

      .comment-view {
        display: block;
        position: relative;
      }

  @deprecated Version 1.10
  @since SproutCore 1.0
*/
SC.StaticLayout = {

  /**
    Walk like a duck.  Used to determine that this mixin has been applied.
    Note that a view that hasStaticLayout still may not actually use static
    layout unless useStaticLayout is also set to YES.

    @type Boolean
    @default YES
  */
  hasStaticLayout: YES,

  initMixin: function () {
    //@if(debug)
    SC.warn("The SC.StaticLayout mixin code is included in SC.View directly now and the mixin has been deprecated.  Please do not mix it into your views.");
    //@endif
  }

};
