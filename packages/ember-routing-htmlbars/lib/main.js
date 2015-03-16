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

import { renderHelper } from "ember-routing-htmlbars/helpers/render";
import linkTo from "ember-routing-htmlbars/keywords/link-to";
import { actionHelper } from "ember-routing-htmlbars/helpers/action";
import { queryParamsHelper } from "ember-routing-htmlbars/helpers/query-params";

registerHelper('render', renderHelper);
registerHelper('action', actionHelper);
registerHelper('query-params', queryParamsHelper);

registerKeyword('link-to', linkTo);

var deprecatedLinkTo = merge({}, linkTo);
merge(deprecatedLinkTo, {
  link(state, params, hash) {
    linkTo.link.call(this, state, params, hash);
    Ember.deprecate("The 'linkTo' view helper is deprecated in favor of 'link-to'");
  }
});


registerKeyword('linkTo', deprecatedLinkTo);

export default Ember;
