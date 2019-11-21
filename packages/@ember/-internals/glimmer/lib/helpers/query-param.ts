/**
@module ember
*/
import { QueryParams } from '@ember/-internals/routing';
import { assert } from '@ember/debug';
import { assign } from '@ember/polyfills';
import { VMArguments, CapturedArguments } from '@glimmer/interfaces';
import { InternalHelperReference } from '../utils/references';

/**
  This is a helper to be used in conjunction with the link-to helper.
  It will supply url query parameters to the target route.

  @example In this example we are setting the `direction` query param to the value `"asc"`

  ```app/templates/application.hbs
  <LinkTo
    @route="posts"
    {{query-params direction="asc"}}
  >
    Sort
  </LinkTo>
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

export default function(args: VMArguments) {
  return new InternalHelperReference(queryParams, args.capture());
}
