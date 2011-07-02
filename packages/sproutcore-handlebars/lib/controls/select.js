// ==========================================================================
// Project:   SproutCore Handlebar Views
// Copyright: ©2011 Strobe Inc. and contributors.
// License:   Licensed under MIT license (see license.js)
// ==========================================================================

var get = SC.get, set = SC.set;

SC.SelectOption = SC.View.extend({
   tagName: 'option',
   template: SC.Handlebars.compile("{{label}}"),
   attributeBindings: ['value', 'selected'],
   label: function() {
     var content = get(this, 'content');
     
     if (content) {
       if (typeof content !== "string") {
         return content.label;
       } else {
         return content;
       }
     }
   }.property(),
   value: function() {
     var ret, content = get(this, 'content');
     
     if (typeof content === "object") {
       ret = content.value;
     } else {
       ret = content;
     }
     return ret;
   }.property(),
  selected: function() {
    return !!get(this, 'content').selected;
  }.property()
});

SC.Select = SC.CollectionView.extend({
  tagName: 'select',
  itemViewClass: SC.SelectOption,
  selected: function() {
    var content = get(this, 'content');
    return content.filterProperty('selected').objectAt(0) || content.objectAt(0);
  }.property('content.@each.selected')
});
