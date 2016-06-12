/**
@module ember
@submodule ember-views
*/
import { Mixin } from 'ember-metal/mixin';
import { get } from 'ember-metal/property_get';

/**
  @class InstrumentationSupport
  @namespace Ember
  @public
*/
export default Mixin.create({
  /**
    Used to identify this view during debugging

    @property instrumentDisplay
    @type String
    @public
  */
  instrumentDisplay: '',

  instrumentName: 'view',

  instrumentDetails(hash) {
    hash.template = get(this, 'templateName');
    this._super(hash);
  }
});
