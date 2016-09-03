/**
@module ember
@submodule ember-views
*/
import {
  Mixin,
  get
} from 'ember-metal';

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
    return this._super(hash);
  }
});
