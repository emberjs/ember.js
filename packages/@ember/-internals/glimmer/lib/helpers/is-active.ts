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

    const args = queryParams ? [...models, { queryParams }] : [...models];
    return this.router.isActive(routeName, ...args);
  }
}
