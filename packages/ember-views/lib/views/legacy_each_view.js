//2.0TODO: Remove this in 2.0
//This is a fallback path for the `{{#each}}` helper that supports deprecated
//behavior such as itemController.

import legacyEachTemplate from 'ember-htmlbars/templates/legacy-each';
import { get } from 'ember-metal/property_get';
import { computed } from 'ember-metal/computed';
import View from 'ember-views/views/view';
import { CONTAINER_MAP } from 'ember-views/views/collection_view';
import EmptyViewSupport from 'ember-views/mixins/empty_view_support';

export default View.extend(EmptyViewSupport, {
  template: legacyEachTemplate,
  tagName: '',

  /*
    Support for ArrayController has been extracted to the ember-legacy-controllers addon.
  */

  _arrangedContent: computed('attrs.content', function() {
    return this.getAttr('content');
  }),

  _itemTagName: computed(function() {
    var tagName = get(this, 'tagName');
    return CONTAINER_MAP[tagName];
  })
});
