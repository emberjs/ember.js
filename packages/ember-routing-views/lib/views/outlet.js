/**
@module ember
@submodule ember-routing-views
*/

import View from 'ember-views/views/view';
import topLevelViewTemplate from 'ember-htmlbars/templates/top-level-view';
topLevelViewTemplate.meta.revision = 'Ember@VERSION_STRING_PLACEHOLDER';

export var CoreOutletView = View.extend({
  defaultTemplate: topLevelViewTemplate,

  init() {
    this._super();
    this._outlets = [];
  },

  setOutletState(state) {
    this.outletState = { main: state };

    if (this.env) {
      this.env.outletState = this.outletState;
    }

    if (this.lastResult) {
      this.dirtyOutlets();
      this._outlets = [];

      this.scheduleRevalidate(null, null);
    }
  },

  dirtyOutlets() {
    // Dirty any render nodes that correspond to outlets
    for (var i = 0; i < this._outlets.length; i++) {
      this._outlets[i].isDirty = true;
    }
  }
});

export var OutletView = CoreOutletView.extend({ tagName: '' });
