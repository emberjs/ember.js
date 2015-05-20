//2.0TODO: Remove this in 2.0
//This is a fallback path for the `{{#each}}` helper that supports deprecated
//behavior such as itemController.

import legacyEachTemplate from "ember-htmlbars/templates/legacy-each";
import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";
import { computed } from "ember-metal/computed";
import View from "ember-views/views/view";
import { CONTAINER_MAP } from "ember-views/views/collection_view";
import EmptyViewSupport from "ember-views/mixins/empty_view_support";

export default View.extend(EmptyViewSupport, {
  template: legacyEachTemplate,
  tagName: '',

  _arrayController: computed(function() {
    var itemController = this.getAttr('itemController');
    var controller = get(this, 'container').lookupFactory('controller:array').create({
      _isVirtual: true,
      parentController: get(this, 'controller'),
      itemController: itemController,
      target: get(this, 'controller'),
      _eachView: this,
      content: this.getAttr('content')
    });

    return controller;
  }),

  willUpdate(attrs) {
    let itemController = this.getAttrFor(attrs, 'itemController');

    if (itemController) {
      let arrayController = get(this, '_arrayController');
      set(arrayController, 'content', this.getAttrFor(attrs, 'content'));
    }
  },

  _arrangedContent: computed('attrs.content', function() {
    if (this.getAttr('itemController')) {
      return get(this, '_arrayController');
    }

    return this.getAttr('content');
  }),

  _itemTagName: computed(function() {
    var tagName = get(this, 'tagName');
    return CONTAINER_MAP[tagName];
  })
});
