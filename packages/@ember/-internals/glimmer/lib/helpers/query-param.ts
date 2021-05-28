/**
@module ember
*/
import { QueryParams } from '@ember/-internals/routing';
import { assert, deprecate } from '@ember/debug';
import { CapturedArguments } from '@glimmer/interfaces';
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
export default internalHelper(({ positional, named }: CapturedArguments) => {
  return createComputeRef(() => {
    assert(
      "The `query-params` helper only accepts named arguments, e.g. (query-params queryParamPropertyName='foo') as opposed to (query-params 'foo')",
      positional.length === 0
    );

    deprecate(
      'The `query-params` helper is deprecated. Invoke `<LinkTo>` with the `@query` named argument and the `hash` helper instead.',
      false,
      {
        id: 'ember-glimmer.link-to.positional-arguments',
        until: '4.0.0',
        for: 'ember-source',
        url: 'https://deprecations.emberjs.com/v3.x#toc_ember-glimmer-link-to-positional-arguments',
        since: {
          enabled: '3.26.0-beta.1',
        },
      }
    );

    return new QueryParams(Object.assign({}, reifyNamed(named) as any));
  });
});
