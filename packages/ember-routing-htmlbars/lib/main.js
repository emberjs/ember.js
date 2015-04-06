/**
Ember Routing HTMLBars Helpers

@module ember
@submodule ember-routing-htmlbars
@requires ember-routing
*/

import Ember from "ember-metal/core";
import merge from "ember-metal/merge";

import { registerHelper } from "ember-htmlbars/helpers";
import { registerKeyword } from "ember-htmlbars/keywords";

import { queryParamsHelper } from "ember-routing-htmlbars/helpers/query-params";
import action from "ember-routing-htmlbars/keywords/action";
import linkTo from "ember-routing-htmlbars/keywords/link-to";
import render from "ember-routing-htmlbars/keywords/render";

registerHelper('query-params', queryParamsHelper);

registerKeyword('action', action);
registerKeyword('link-to', linkTo);
registerKeyword('render', render);

var deprecatedLinkTo = merge({}, linkTo);
merge(deprecatedLinkTo, {
  link(state, params, hash) {
    linkTo.link.call(this, state, params, hash);
    Ember.deprecate("The 'linkTo' view helper is deprecated in favor of 'link-to'");
  }
});


registerKeyword('linkTo', deprecatedLinkTo);

export default Ember;
