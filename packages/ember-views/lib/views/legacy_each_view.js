//2.0TODO: Remove this in 2.0
//This is a fallback path for the `{{#each}}` helper that supports deprecated
//behavior such as itemController.

import legacyEachTemplate from "ember-htmlbars/templates/legacy-each";
import { get } from "ember-metal/property_get";
import { set } from "ember-metal/property_set";
import { computed } from "ember-metal/computed";
import View from "ember-views/views/view";
import { CONTAINER_MAP } from "ember-views/views/collection_view";

export default View.extend({
  template: legacyEachTemplate,

  _arrayController: computed(function() {
    var itemController = get(this, 'attrs.itemController');
    var controller = get(this, 'controller.container').lookupFactory('controller:array').create({
      _isVirtual: true,
      parentController: get(this, 'controller'),
      itemController: itemController,
      target: get(this, 'controller'),
      _eachView: this,
      content: get(this, 'attrs.content')
    });

    return controller;
  }),

  willUpdate(attrs) {
    let itemController = get(this, 'attrs.itemController');

    if (itemController) {
      let arrayController = get(this, '_arrayController');
      set(arrayController, 'content', attrs.content);
    }
  },

  _arrangedContent: computed('attrs.content', function() {
    if (get(this, 'attrs.itemController')) {
      return get(this, '_arrayController');
    }

    return get(this, 'attrs.content');
  }),

  _itemTagName: computed(function() {
    var tagName = get(this, 'tagName');
    return CONTAINER_MAP[tagName];
  })
});
