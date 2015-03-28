import run from 'ember-metal/run_loop';
import _MetamorphView from "ember-views/views/metamorph_view";
import NormalizedRerenderIfNeededSupport from "ember-views/mixins/normalized_rerender_if_needed";
import renderView from "ember-htmlbars/system/render-view";

export default _MetamorphView.extend(NormalizedRerenderIfNeededSupport, {
  init: function() {
    this._super.apply(this, arguments);

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

    var template = result ? this.truthyTemplate : this.falsyTemplate;
    renderView(this, buffer, template);
  }
});
