/**
 @module ember
 @submodule ember-views
*/

import { Mixin } from 'ember-metal/mixin';
import View from 'ember-views/views/view';
import { get } from 'ember-metal/property_get';
import { set } from 'ember-metal/property_set';
import { computed } from 'ember-metal/computed';

/**
 @class EmptyViewSupport
 @namespace Ember
 @private
*/
export default Mixin.create({
  /**
   This provides metadata about what kind of empty view class this
   collection would like if it is being instantiated from another
   system (like Handlebars)

   @private
   @property emptyViewClass
  */
  emptyViewClass: View,

  /**
   An optional view to display if content is set to an empty array.

   @property emptyView
   @type Ember.View
   @default null
   @private
  */
  emptyView: null,

  _emptyView: computed('emptyView', 'attrs.emptyViewClass', 'emptyViewClass', function() {
    var emptyView = get(this, 'emptyView');
    var attrsEmptyViewClass = this.getAttr('emptyViewClass');
    var emptyViewClass = get(this, 'emptyViewClass');
    var inverse = get(this, '_itemViewInverse');
    var actualEmpty = emptyView || attrsEmptyViewClass;

    // Somehow, our previous semantics differed depending on whether the
    // `emptyViewClass` was provided on the JavaScript class or via the
    // Handlebars template.
    // In Glimmer, we disambiguate between the two by checking first (and
    // preferring) the attrs-supplied class.
    // If not present, we fall back to the class's `emptyViewClass`, but only
    // if an inverse has been provided via an `{{else}}`.
    if (inverse && actualEmpty) {
      if (actualEmpty.extend) {
        return actualEmpty.extend({ template: inverse });
      } else {
        set(actualEmpty, 'template', inverse);
      }
    } else if (inverse && emptyViewClass) {
      return emptyViewClass.extend({ template: inverse });
    }

    return actualEmpty;
  })
});
