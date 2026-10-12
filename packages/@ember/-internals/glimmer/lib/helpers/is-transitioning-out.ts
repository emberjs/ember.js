import RouteHelper, { type RouteNamed, type RoutePositional } from './-route-helper';

/**
  The `isTransitioningOut` helper returns `true` during a transition,
  when the given route is active now and will not be active after the transition.
  It uses the same logic as the `ember-transitioning-out` class of `<LinkTo>`.

  ```gjs
  import { isTransitioningOut, urlFor } from '@ember/routing';

  <template>
    <a href={{urlFor "about"}} class={{if (isTransitioningOut "about") "leaving"}}>
      About
    </a>
  </template>
  ```

  The helper takes the same arguments as `urlFor`.
  It returns `false` when the route name or a model is `null` or `undefined`.

  @method isTransitioningOut
  @for @ember/routing
  @static
  @param {String} routeName the name of the route
  @param {...String|Number} models the values of the dynamic segments of the route
  @param {Object} [named] the `models` and `queryParams` named arguments
  @return {Boolean} `true` when the transition makes the route inactive
  @public
*/
export default class IsTransitioningOutHelper extends RouteHelper<boolean> {
  protected helperName = 'isTransitioningOut';

  compute(positional: RoutePositional, named: RouteNamed): boolean {
    let args = this.routeStateArgs(positional, named);

    return this.isActive(args) && this.willBeActive(args) === false;
  }
}
