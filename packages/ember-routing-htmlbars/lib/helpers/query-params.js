/**
@module ember
@submodule ember-routing-htmlbars
*/

import Ember from 'ember-metal/core'; // assert
import QueryParams from 'ember-routing/system/query_params';

/**
  This is a sub-expression to be used in conjunction with the link-to helper.
  It will supply url query parameters to the target route.

  Example

  {{#link-to 'posts' (query-params direction="asc")}}Sort{{/link-to}}

  @method query-params
  @for Ember.Handlebars.helpers
  @param {Object} hash takes a hash of query parameters
  @return {String} HTML string
  @public
*/
export function queryParamsHelper(params, hash) {
  Ember.assert('The `query-params` helper only accepts hash parameters, e.g. (query-params queryParamPropertyName=\'foo\') as opposed to just (query-params \'foo\')', params.length === 0);

  return QueryParams.create({
    values: hash
  });
}
