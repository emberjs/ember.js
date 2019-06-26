/**
@module ember
*/
import { EMBER_GLIMMER_ANGLE_BRACKET_BUILT_INS } from '@ember/canary-features';
import { assert } from '@ember/debug';
import { Arguments, CapturedArguments, UNDEFINED_REFERENCE, VM } from '@glimmer/runtime';
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

export default function(_vm: VM, args: Arguments) {
  if (EMBER_GLIMMER_ANGLE_BRACKET_BUILT_INS) {
    assert(
      'The `(query-params)` helper can only be used when invoking the `{{link-to}}` component.'
    );
    return UNDEFINED_REFERENCE;
  } else {
    /* eslint-disable no-inner-declarations */
    function queryParams({ positional, named }: CapturedArguments) {
      // tslint:disable-next-line:max-line-length
      assert(
        "The `query-params` helper only accepts hash parameters, e.g. (query-params queryParamPropertyName='foo') as opposed to just (query-params 'foo')",
        positional.value().length === 0
      );
      return new QueryParams(named.value() as any);
    }

    class QueryParams {
      values: null | object;
      isQueryParams = true;
      constructor(values = null) {
        this.values = values;
      }
    }

    return new InternalHelperReference(queryParams, args.capture());
  }
}
