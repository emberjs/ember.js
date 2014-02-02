// ==========================================================================
// Project:   SproutCore - JavaScript Application Framework
// Copyright: ©2006-2011 Strobe Inc. and contributors.
//            ©2008-2011 Apple Inc. All rights reserved.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================
sc_require("panes/pane");

SC.Pane.reopen(
  /** @scope SC.Pane.prototype */ {

  /**
    Inserts the pane's layer as the first child of the passed element.

    @param {DOMElement|jQuery|String} elem the element to prepend the pane's layer to.
      This is passed to `jQuery()`, so any value supported by `jQuery()` will work.
    @returns {SC.Pane} receiver
  */
  prependTo: function(elem) {
    var self = this;

    return this.insert(function () {
      var el = jQuery(elem)[0];
      self._doAttach(el, el.firstChild);
    });
  },

  /**
    This method has no effect in the pane.  Instead use remove().

    @returns {void}
  */
  removeFromParent: function() {
    throw SC.Error.desc("SC.Pane cannot be removed from its parent, since it's the root. Did you mean remove()?");
  }
});
