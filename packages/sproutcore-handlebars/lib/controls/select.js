// ==========================================================================
// Project:   SproutCore Handlebar Views
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var get = SC.get, set = SC.set;

SC.Select = SC.CollectionView.extend({
  tagName: 'select',
  itemViewClass: SC.View.extend({
     tagName: 'option',
     template: SC.Handlebars.compile("{{content}}")
  })
});