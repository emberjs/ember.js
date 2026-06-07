/**
  The `{{is-active}}` helper returns `true` if the given route (and optional
  models / query params) matches the application's current route state — the
  same logic that `<LinkTo>` uses to apply its `active` CSS class.

  ```handlebars
  <a class={{if (is-active "about") "active"}}>About</a>
  ```

  With a dynamic segment:

  ```handlebars
  {{is-active "post" this.post}}
  ```

  With query params:

  ```handlebars
  {{is-active "posts" queryParams=(hash page=2)}}
  ```

  Returns `false` if the route name or any model is null/undefined (loading state).

  @method is-active
  @for Ember.Templates.helpers
  @public
*/
import type { CapturedArguments, Maybe } from '@glimmer/interfaces';
import type { InternalOwner } from '@ember/-internals/owner';
import { assert } from '@ember/debug';
import { createComputeRef, valueForRef } from '@glimmer/reference/lib/reference';
import { consumeTag } from '@glimmer/validator/lib/tracking';
import { tagFor } from '@glimmer/validator/lib/meta';
import type Route from '@ember/routing/route';
import type { RouterState, RoutingService } from '@ember/routing/-internals';
import { internalHelper } from './internal-helper';

function isMissing(value: unknown): value is null | undefined {
  return value === null || value === undefined;
}

export default internalHelper(
  ({ positional, named }: CapturedArguments, owner: InternalOwner | undefined) => {
    assert('[BUG] missing owner', owner);
    const routing = owner.lookup('service:-routing') as RoutingService<Route>;

    return createComputeRef(
      () => {
        let routeRef = positional[0];
        let routeName = routeRef !== undefined ? (valueForRef(routeRef) as string | null | undefined) : undefined;
        // eslint-disable-next-line @typescript-eslint/no-empty-object-type
        let models = positional.slice(1).map((ref) => valueForRef(ref)) as {}[];
        let queryParamsRef = named['queryParams'];
        let queryParams =
          queryParamsRef !== undefined
            ? (valueForRef(queryParamsRef) as Record<string, unknown>)
            : undefined;

        consumeTag(tagFor(routing, 'currentState'));

        if (isMissing(routeName) || models.some(isMissing)) {
          return false;
        }

        let state = routing.currentState as Maybe<RouterState>;
        if (isMissing(state)) {
          return false;
        }

        return routing.isActiveForRoute(models, queryParams, routeName, state);
      },
      null,
      'is-active'
    );
  }
);
