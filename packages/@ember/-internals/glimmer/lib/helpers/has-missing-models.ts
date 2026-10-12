import RouteHelper, { type RouteNamed, type RoutePositional } from './-route-helper';

/**
  The `hasMissingModels` helper returns `true` when one of the models
  is `null` or `undefined`.
  It also returns `true` when the route name is `null` or `undefined`.

  `<LinkTo>` uses the same condition for its `loading` class.
  The helper does not read the state of the router.

  ```gjs
  import { hasMissingModels, urlFor } from '@ember/routing';

  <template>
    {{#if (hasMissingModels "post" @post)}}
      <span>Post</span>
    {{else}}
      <a href={{urlFor "post" @post}}>Post</a>
    {{/if}}
  </template>
  ```

  The helper takes the same arguments as `urlFor`.
  It does not use the query params.

  @method hasMissingModels
  @for @ember/routing
  @static
  @param {String} routeName the name of the route
  @param {...Object} models the model(s) for the route
  @param {Object} [named] the `models` and `queryParams` named arguments
  @return {Boolean} `true` when the route name or a model is missing
  @public
*/
export default class HasMissingModelsHelper extends RouteHelper<boolean> {
  protected helperName = 'hasMissingModels';

  compute(positional: RoutePositional, named: RouteNamed): boolean {
    return this.hasMissingModels(this.routeArgs(positional, named));
  }
}
