/**
  The `{{is-loading}}` helper returns `true` if the route name or any of the
  passed models are null or undefined, mirroring the loading state that
  `<LinkTo>` detects when it renders `#` as the href.

  ```handlebars
  {{#if (is-loading "post" this.post)}}
    Loading…
  {{else}}
    <a href={{url-for "post" this.post}}>{{this.post.title}}</a>
  {{/if}}
  ```

  @method is-loading
  @for Ember.Templates.helpers
  @public
*/
import type { CapturedArguments } from '@glimmer/interfaces';
import { createComputeRef, valueForRef } from '@glimmer/reference/lib/reference';
import { internalHelper } from './internal-helper';

function isMissing(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

export default internalHelper(({ positional }: CapturedArguments) => {
  return createComputeRef(
    () => {
      let routeRef = positional[0];
      let routeName = routeRef !== undefined ? valueForRef(routeRef) : undefined;
      let models = positional.slice(1).map((ref) => valueForRef(ref));
      return isMissing(routeName) || models.some(isMissing);
    },
    null,
    'is-loading'
  );
});
