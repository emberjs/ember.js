/**
  The `{{isActive}}` helper returns `true` if the given route (and optional
  models / query params) matches the application's current route state — the
  same logic that `<LinkTo>` uses to apply its `active` CSS class.

  ```javascript
  import { isActive } from '@ember/routing';
  ```

  ```handlebars
  <a class={{if (isActive "about") "active"}}>About</a>
  ```

  With a dynamic segment:

  ```handlebars
  {{isActive "post" this.post}}
  ```

  With query params:

  ```handlebars
  {{isActive "posts" queryParams=(hash page=2)}}
  ```

  Returns `false` if the route name or any model is null/undefined (loading state).

  @method is-active
  @for Ember.Templates.helpers
  @public
*/
import type { Maybe } from '@glimmer/interfaces';
import type Route from '@ember/routing/route';
import type { RouterState, RoutingService } from '@ember/routing/-internals';
import { service } from '@ember/service';
import Helper from '@ember/component/helper';
import { isMissing } from './-router-helpers-utils';

export default class IsActiveHelper extends Helper {
  @service('-routing') declare private routing: RoutingService<Route>;

  compute(
    [routeName, ...models]: [string | null | undefined, ...unknown[]],
    { queryParams }: { queryParams?: Record<string, unknown> }
  ): boolean {
    if (isMissing(routeName) || models.some(isMissing)) {
      return false;
    }

    const state = this.routing.currentState as Maybe<RouterState>;
    if (isMissing(state)) {
      return false;
    }

    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    return this.routing.isActiveForRoute(models as {}[], queryParams, routeName, state);
  }
}
