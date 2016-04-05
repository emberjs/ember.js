/**
 @module ember
 @submodule ember-views
*/

import { Mixin } from 'ember-metal/mixin';

/**
 @class AriaSupport
 @namespace Ember
 @private
*/
export default Mixin.create({
  attributeBindings: ['ariaRole:role'],

  init() {
    this._super(...arguments);

    if (!this.attributeBindings) {
      this.attributeBindings = [];
    }

    Object.keys(this).forEach(attr => {
      if (attr.startsWith('aria-')) {
        this.attributeBindings.push(attr);
      }
    });
  },

  /**
   The WAI-ARIA role of the control represented by this view. For example, a
   button may have a role of type 'button', or a pane may have a role of
   type 'alertdialog'. This property is used by assistive software to help
   visually challenged users navigate rich web applications.

   The full list of valid WAI-ARIA roles is available at:
   [http://www.w3.org/TR/wai-aria/roles#roles_categorization](http://www.w3.org/TR/wai-aria/roles#roles_categorization)

   @property ariaRole
   @type String
   @default null
   @public
  */
  ariaRole: null
});
