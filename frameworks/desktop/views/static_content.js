// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/** @class

  StaticContentView allows you to display arbitrary HTML content inside your
  view hierarchy.

  Normally, views in SproutCore are absolutely positioned. Their width and
  height are either pre-determined, or specified relative to their enclosing
  view. Occasionally, you may want to display content that is laid out by
  the browser. For example, if you were writing a documentation browser, you
  may want to display the table of contents as an SC.ListView, but the actual
  pages as HTML content.

  This class is most useful when placed inside a ScrollView.

  To use it, simply set the `content` property to a string of the HTML you
  would like to display.

  @extends SC.View
  @since SproutCore 1.2
  @author Tom Dale
*/
SC.StaticContentView = SC.View.extend(
/** @scope SC.StaticContentView.prototype */ {

  /**
    @type Array
    @default ['sc-static-content-view']
    @see SC.View#classNames
  */
  classNames: ['sc-static-content-view'],

  /**
    @type Array
    @default ['content']
    @see SC.View#displayProperties
  */
  displayProperties: ['content'],


  // ..........................................................
  // PROPERTIES
  //

  /**
    The HTML content you wish to display. This will be inserted directly into
    the DOM, so ensure that any user-generated content has been escaped.

    @type String
    @default null
  */
  content: null,

  // ..........................................................
  // METHODS
  //

  /**
    Because SproutCore has no way of knowing when the size of the content
    inside a StaticContentView has changed, you should call this method
    whenever an event that may change the size of the content occurs.

    Note that if you change the content property, this will be recalculated
    automatically.
  */
  contentLayoutDidChange: function() {
    this._viewFrameDidChange();
  },

  // ..........................................................
  // INTERNAL SUPPORT
  //

  /** @private
    Disable SproutCore management of view positioning.
  */
  useStaticLayout: YES,

  /** @private
    Overrides SC.View's frame computed property, and returns a value from the
    DOM. This value is cached to improve performance.

    If the size of the content inside the view changes, you should call
    contentLayoutDidChange().

    @property
  */
  frame: function() {
    var layer = this.get('layer'), rect;

    if (!layer) return { x: 0, y: 0, width: 0, height: 0 };

    if (layer.getBoundingClientRect && !SC.browser.isIE8OrLower) {
      rect = layer.getBoundingClientRect();

      return { x: 0, y: 0, width: rect.width, height: rect.height };
    } else {
      return { x: 0, y: 0, width: layer.clientWidth, height: layer.clientHeight };
    }
  }.property('content').cacheable(),

  /** @private
    Recalculate content frame if our parent view resizes.
  */
  parentViewDidResize: function() {
    this.contentLayoutDidChange();
  },

  /** @private
    If the layer changes, make sure we recalculate the frame.
  */
  didUpdateLayer: function() {
    this.contentLayoutDidChange();
  },

  /** @private
    Outputs the content property to the DOM.

    @param {SC.RenderContext} context
    @param {Boolean} firstTime
  */
  render: function(context, firstTime) {
    var content = this.get('content');

    context.push(content || '');
  },

  /** @private */
  touchStart: function(evt){
    evt.allowDefault();
    return YES;
  },

  /** @private */
  touchEnd: function(evt){
    evt.allowDefault();
    return YES;
  }

});
