/**
@module ember
@submodule ember-routing-views
*/

import View from "ember-views/views/view";
import { _Metamorph } from "ember-views/views/metamorph_view";

import topLevelViewTemplate from "ember-htmlbars/templates/top-level-view";
topLevelViewTemplate.revision = 'Ember@VERSION_STRING_PLACEHOLDER';

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

      this.scheduleRevalidate();
    }
  },

  dirtyOutlets() {
    // Dirty any render nodes that correspond to outlets
    dirtyOutlets(this);
  }
});

// 2.0TODO: This recursive helper was needed due to the legacy
// `{{render}}` helper, because it is its own ownerView, so any
// outlets in its children end up listed inside of it, and not on the
// top-level outlet.
function dirtyOutlets(view) {
  for (var i = 0; i < view._outlets.length; i++) {
    var outlet = view._outlets[i];
    outlet.isDirty = true;
    if (outlet.emberView && outlet.emberView._outlets) {
      dirtyOutlets(outlet.emberView);
    }
  }
}

export var OutletView = CoreOutletView.extend(_Metamorph);
