import RouteHelper, { type RouteNamed, type RoutePositional } from './-route-helper';

/**
  The `isTransitioningIn` helper returns `true` during a transition,
  when the given route is not active now and will be active after the transition.
  It uses the same logic as the `ember-transitioning-in` class of `<LinkTo>`.

  ```gjs
  import { isTransitioningIn, urlFor } from '@ember/routing';

  <template>
    <a href={{urlFor "about"}} class={{if (isTransitioningIn "about") "entering"}}>
      About
    </a>
  </template>
  ```

  The helper takes the same arguments as `urlFor`.
  It returns `false` when the route name or a model is `null` or `undefined`.

  @method isTransitioningIn
  @for @ember/routing
  @static
  @param {String} routeName the name of the route
  @param {...Object} models the model(s) for the route
  @param {Object} [named] the `models` and `queryParams` named arguments
  @return {Boolean} `true` when the transition makes the route active
  @public
*/
export default class IsTransitioningInHelper extends RouteHelper<boolean> {
  protected helperName = 'isTransitioningIn';

  compute(positional: RoutePositional, named: RouteNamed): boolean {
    let args = this.routeArgs(positional, named);

    return !this.isActive(args) && this.willBeActive(args) === true;
  }
}
