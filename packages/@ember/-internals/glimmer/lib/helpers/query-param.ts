/**
@module ember
*/
import { QueryParams } from '@ember/-internals/routing';
import { assert } from '@ember/debug';
import { assign } from '@ember/polyfills';
import { VMArguments } from '@glimmer/interfaces';
import { createComputeRef } from '@glimmer/reference';
import { reifyNamed } from '@glimmer/runtime';
import { internalHelper } from './internal-helper';

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
export default internalHelper((args: VMArguments) => {
  let { positional, named } = args.capture();

  return createComputeRef(() => {
    assert(
      "The `query-params` helper only accepts hash parameters, e.g. (query-params queryParamPropertyName='foo') as opposed to just (query-params 'foo')",
      positional.length === 0
    );

    return new QueryParams(assign({}, reifyNamed(named) as any));
  });
});
