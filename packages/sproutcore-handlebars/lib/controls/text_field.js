// ==========================================================================
// Project:   SproutCore Handlebar Views
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

require("sproutcore-handlebars/ext");
require("sproutcore-views/views/view");
require("sproutcore-handlebars/controls/text_support");
/** @class */

var get = SC.get, set = SC.set;

SC.TextField = SC.View.extend(SC.TextSupport,
  /** @scope SC.TextField.prototype */ {

  classNames: ['sc-text-field'],

  tagName: "input",
  attributeBindings: ['type', 'value'],
  type: "text",

  /**
    @private
  */
  _updateElementValue: function() {
    this.$().val(get(this, 'value'));
  }

});
