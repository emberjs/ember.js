/**
@module ember
*/
import { QueryParams } from '@ember/-internals/routing';
import { assert } from '@ember/debug';
import { assign } from '@ember/polyfills';
import { Arguments, CapturedArguments, VM } from '@glimmer/runtime';
import { InternalHelperReference } from '../utils/references';

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
function queryParams({ positional, named }: CapturedArguments) {
  // tslint:disable-next-line:max-line-length
  assert(
    "The `query-params` helper only accepts hash parameters, e.g. (query-params queryParamPropertyName='foo') as opposed to just (query-params 'foo')",
    positional.value().length === 0
  );

  return new QueryParams(assign({}, named.value() as any));
}

export default function(_vm: VM, args: Arguments) {
  return new InternalHelperReference(queryParams, args.capture());
}
