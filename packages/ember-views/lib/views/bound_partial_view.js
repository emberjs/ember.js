/**
@module ember
@submodule ember-views
*/

import { set } from "ember-metal/property_set";
import run from 'ember-metal/run_loop';
import _MetamorphView from "ember-views/views/metamorph_view";
import NormalizedRerenderIfNeededSupport from "ember-views/mixins/normalized_rerender_if_needed";
import lookupPartial from "ember-views/system/lookup_partial";
import run from 'ember-metal/run_loop';

export default _MetamorphView.extend(NormalizedRerenderIfNeededSupport, {
  init: function() {
    this._super();

    var self = this;

    this.templateNameStream.subscribe(this._wrapAsScheduled(function() {
      run.scheduleOnce('render', self, 'rerenderIfNeeded');
    }));
  },

  normalizedValue: function() {
    return this.templateNameStream.value();
  },

  render: function(buffer) {
    var templateName = this.normalizedValue();
    this._lastNormalizedValue = templateName;

    if (templateName) {
      set(this, 'template', lookupPartial(this, templateName));
    } else {
      set(this, 'template', this.emptyTemplate);
    }

    return this._super(buffer);
  }
});
