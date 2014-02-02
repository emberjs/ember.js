// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            Portions ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

/**
  @deprecated SC.AutoMixin is deprecated. Please use the property autoMixins of SC.View instead
  @namespace

  Use this mixin to automatically mix in a list of mixins into all
  child views created _by the view_ (that are created at view initialization).

  @since SproutCore 1.0
*/
SC.AutoMixin = {

  /**
    An array of mixins to automatically mix in to each child view of this
    view when the child view is created.

    @type Array
    @default []
  */
  autoMixins: [],

  /**
    @private
    Override createChildViews to mix in the mixins defined in autoMixins.
  */
  createChildView: function (view, attrs) {
    if (!view.isClass) {
      attrs = view;
    } else {
      // attrs should always exist...
      if (!attrs) { attrs = {}; }
      // clone the hash that was given so we do not pollute it if it's being reused
      else { attrs = SC.clone(attrs); }
    }

    attrs.owner = attrs.parentView = this;
    if (!attrs.page) attrs.page = this.page;

    if (view.isClass) {
      // Track that we created this view.
      attrs.createdByParent = true;

      // Add the mixins to the child's attributes.
      var applyMixins = SC.clone(this.get("autoMixins"));
      applyMixins.push(attrs);

      view = view.create.apply(view, applyMixins);
    }

    return view;
  }

};
