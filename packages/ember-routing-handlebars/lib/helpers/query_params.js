/**
@module ember
@submodule ember-routing-handlebars
*/

import Ember from "ember-metal/core"; // assert
import { fmt } from "ember-runtime/system/string";
import QueryParams from "ember-routing/system/query_params";

/**
  This is a sub-expression to be used in conjunction with the link-to helper.
  It will supply url query parameters to the target route.

  Example

  {{#link-to 'posts' (query-params direction="asc")}}Sort{{/link-to}}

  @method query-params
  @for Ember.Handlebars.helpers
  @param {Object} hash takes a hash of query parameters
  @return {String} HTML string
*/
export function queryParamsHelper(options) {
  Ember.assert(fmt("The `query-params` helper only accepts hash parameters, e.g. (query-params queryParamPropertyName='%@') as opposed to just (query-params '%@')", [options, options]), arguments.length === 1);

  var view = options.data.view;
  var hash = options.hash;
  var hashTypes = options.hashTypes;

  for (var k in hash) {
    if (hashTypes[k] === 'ID') {
      hash[k] = view.getStream(hash[k]);
    }
  }

  return QueryParams.create({
    values: options.hash
  });
}
