/**
@module ember
@submodule ember-glimmer
*/
import { assign } from 'ember-utils';
import { InternalHelperReference } from '../utils/references';
import { assert } from 'ember-debug';
import { QueryParams } from 'ember-routing';

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
function queryParams({ positional, named }) {
  assert('The `query-params` helper only accepts hash parameters, e.g. (query-params queryParamPropertyName=\'foo\') as opposed to just (query-params \'foo\')', positional.value().length === 0);

  return QueryParams.create({
    values: assign({}, named.value())
  });
}

export default function(vm, args) {
  return new InternalHelperReference(queryParams, args);
}
