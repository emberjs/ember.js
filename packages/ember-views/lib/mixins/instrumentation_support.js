/**
@module ember
@submodule ember-views
*/
import { Mixin } from "ember-metal/mixin";
import { computed } from "ember-metal/computed";
import { get } from "ember-metal/property_get";

/**
  @class InstrumentationSupport
  @namespace Ember
  @public
*/
var InstrumentationSupport = Mixin.create({
  /**
    Used to identify this view during debugging

    @property instrumentDisplay
    @type String
    @public
  */
  instrumentDisplay: computed(function() {
    if (this.helperName) {
      return '{{' + this.helperName + '}}';
    }
  }),

  instrumentName: 'view',

  instrumentDetails(hash) {
    hash.template = get(this, 'templateName');
    this._super(hash);
  }
});

export default InstrumentationSupport;
