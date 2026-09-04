/**
  The `{{isActive}}` helper returns `true` if the given route (and optional
  models / query params) matches the application's current route state — the
  same logic that `<LinkTo>` uses to apply its `active` CSS class.

  ```javascript
  import { isActive } from '@ember/routing';
  ```

  ```gjs
  <a class={{if (isActive "about") "active"}}>About</a>
  ```

  With a dynamic segment:

  ```gjs
  {{isActive "post" this.post}}
  ```

  With query params:

  ```gjs
  {{isActive "posts" queryParams=(hash page=2)}}
  ```

  Returns `false` if the route name or any model is null/undefined (loading state).

  @method is-active
  @for Ember.Templates.helpers
  @public
*/
import type RouterService from '@ember/routing/router-service';
import { service } from '@ember/service';
import Helper from '@ember/component/helper';
import { isMissing } from './-router-helpers-utils';

export default class IsActiveHelper extends Helper {
  @service('router') declare private router: RouterService;

  compute(
    [routeName, ...models]: [string | null | undefined, ...unknown[]],
    { queryParams }: { queryParams?: Record<string, unknown> }
  ): boolean {
    if (isMissing(routeName) || models.some(isMissing)) {
      return false;
    }

    // Also entangle with currentRouteName. `isActive()` only consumes the
    // `currentURL` tag (see emberjs/ember.js#19004), but a transition out of a
    // loading/error substate keeps the URL at the destination while only the
    // route name changes (e.g. `loading` -> `about`, with the URL already at
    // `/about`). Without consuming currentRouteName the helper wouldn't
    // recompute across that boundary and would render a stale value.
    void this.router.currentRouteName;

    const args = queryParams ? [...models, { queryParams }] : [...models];
    return this.router.isActive(routeName, ...args);
  }
}
