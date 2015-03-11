/**
Ember Routing HTMLBars Helpers

@module ember
@submodule ember-routing-htmlbars
@requires ember-routing
*/

import Ember from "ember-metal/core";

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
registerKeyword('linkTo', linkTo);

export default Ember;
