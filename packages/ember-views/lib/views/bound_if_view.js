import { set } from "ember-metal/property_set";
import run from 'ember-metal/run_loop';
import _MetamorphView from "ember-views/views/metamorph_view";
import NormalizedRerenderIfNeededSupport from "ember-views/mixins/normalized_rerender_if_needed";

export default _MetamorphView.extend(NormalizedRerenderIfNeededSupport, {
  init: function() {
    this._super();

    var self = this;

    this.conditionStream.subscribe(this._wrapAsScheduled(function() {
      run.scheduleOnce('render', self, 'rerenderIfNeeded');
    }));
  },

  normalizedValue: function() {
    return this.conditionStream.value();
  },

  render: function(buffer) {
    var result = this.conditionStream.value();
    this._lastNormalizedValue = result;

    if (result) {
      set(this, 'template', this.truthyTemplate);
    } else {
      set(this, 'template', this.falsyTemplate);
    }

    return this._super(buffer);
  }
});
