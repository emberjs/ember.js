/**
  The `{{isLoading}}` helper returns `true` if the route name or any of the
  passed models are null or undefined, mirroring the loading state that
  `<LinkTo>` detects when it renders `#` as the href.

  ```javascript
  import { isLoading, urlFor } from '@ember/routing';
  ```

  ```gjs
  {{#if (isLoading "post" this.post)}}
    Loading…
  {{else}}
    <a href={{urlFor "post" this.post}}>{{this.post.title}}</a>
  {{/if}}
  ```

  @method is-loading
  @for Ember.Templates.helpers
  @public
*/
import { isMissing } from './-router-helpers-utils';

export default function isLoading(routeName: unknown, ...models: unknown[]): boolean {
  return !routeName || models.some(isMissing);
}
