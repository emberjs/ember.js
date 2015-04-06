/**
Ember Routing Views

@module ember
@submodule ember-routing-views
@requires ember-routing
*/

import Ember from "ember-metal/core";
import "ember-routing-views/initializers/link-to-component";

import LinkView from "ember-routing-views/views/link";
import {
  OutletView,
  CoreOutletView
} from "ember-routing-views/views/outlet";

Ember.LinkView = LinkView;
Ember.OutletView = OutletView;
if (Ember.FEATURES.isEnabled('ember-routing-core-outlet')) {
  Ember.CoreOutletView = CoreOutletView;
}

export default Ember;
