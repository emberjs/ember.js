/**
Ember Routing HTMLBars Helpers

@module ember
@submodule ember-routing-htmlbars
@requires ember-routing
*/

import Ember from "ember-metal/core";

import { registerHelper } from "ember-htmlbars/helpers";

import { outletHelper } from "ember-routing-htmlbars/helpers/outlet";

registerHelper('outlet', outletHelper);

export default Ember;
