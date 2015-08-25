/**
@module ember
@submodule ember-routing-htmlbars
*/

import { assert } from 'ember-metal/debug';
import QueryParams from 'ember-routing/system/query_params';

/**
  This is a helper to be used in conjunction with the link-to helper.
  It will supply url query parameters to the target route.

  Example

  ```handlebars
  {{#link-to 'posts' (query-params direction="asc")}}Sort{{/link-to}}
  ```

  @method query-params
  @for Ember.Templates.helpers
  @param {Object} hash takes a hash of query parameters
  @return {Object} A `QueryParams` object for `{{link-to}}`
  @public
*/
export function queryParamsHelper(params, hash) {
  assert('The `query-params` helper only accepts hash parameters, e.g. (query-params queryParamPropertyName=\'foo\') as opposed to just (query-params \'foo\')', params.length === 0);

  return QueryParams.create({
    values: hash
  });
}
