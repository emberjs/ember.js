import { Route, RouterState, RoutingService } from '@ember/-internals/routing';
import { isSimpleClick } from '@ember/-internals/views';
import { assert, debugFreeze, inspect, warn } from '@ember/debug';
import { getEngineParent } from '@ember/engine';
import EngineInstance from '@ember/engine/instance';
import { flaggedInstrument } from '@ember/instrumentation';
import { action } from '@ember/object';
import { service } from '@ember/service';
import { DEBUG } from '@glimmer/env';
import { Maybe, Option } from '@glimmer/interfaces';
import { consumeTag, createCache, getValue, tagFor, untrack } from '@glimmer/validator';
import { Transition } from 'router_js';
import LinkToTemplate from '../templates/link-to';
import InternalComponent, { opaquify } from './internal';

const EMPTY_ARRAY: {}[] = [];
const EMPTY_QUERY_PARAMS = {};

debugFreeze(EMPTY_ARRAY);
debugFreeze(EMPTY_QUERY_PARAMS);

function isMissing<T>(value: Maybe<T>): value is null | undefined {
  return value === null || value === undefined;
}

function isPresent<T>(value: Maybe<T>): value is T {
  return !isMissing(value);
}

interface QueryParams {
  isQueryParams: true;
  values: Option<{}>;
}

function isQueryParams(value: unknown): value is QueryParams {
  return typeof value === 'object' && value !== null && value['isQueryParams'] === true;
}

/**
  The `LinkTo` component renders a link to the supplied `routeName` passing an optionally
  supplied model to the route as its `model` context of the route. The block for `LinkTo`
  becomes the contents of the rendered element:

  ```handlebars
  <LinkTo @route='photoGallery'>
    Great Hamster Photos
  </LinkTo>
  ```

  This will result in:

  ```html
  <a href="/hamster-photos">
    Great Hamster Photos
  </a>
  ```

  ### Disabling the `LinkTo` component

  The `LinkTo` component can be disabled by using the `disabled` argument. A disabled link
  doesn't result in a transition when activated, and adds the `disabled` class to the `<a>`
  element.

  (The class name to apply to the element can be overridden by using the `disabledClass`
  argument)

  ```handlebars
  <LinkTo @route='photoGallery' @disabled={{true}}>
    Great Hamster Photos
  </LinkTo>
  ```

  ### Handling `href`

  `<LinkTo>` will use your application's Router to fill the element's `href` property with a URL
  that matches the path to the supplied `routeName`.

  ### Handling current route

  The `LinkTo` component will apply a CSS class name of 'active' when the application's current
  route matches the supplied routeName. For example, if the application's current route is
  'photoGallery.recent', then the following invocation of `LinkTo`:

  ```handlebars
  <LinkTo @route='photoGallery.recent'>
    Great Hamster Photos
  </LinkTo>
  ```

  will result in

  ```html
  <a href="/hamster-photos/this-week" class="active">
    Great Hamster Photos
  </a>
  ```

  The CSS class used for active classes can be customized by passing an `activeClass` argument:

  ```handlebars
  <LinkTo @route='photoGallery.recent' @activeClass="current-url">
    Great Hamster Photos
  </LinkTo>
  ```

  ```html
  <a href="/hamster-photos/this-week" class="current-url">
    Great Hamster Photos
  </a>
  ```

  ### Keeping a link active for other routes

  If you need a link to be 'active' even when it doesn't match the current route, you can use the
  `current-when` argument.

  ```handlebars
  <LinkTo @route='photoGallery' @current-when='photos'>
    Photo Gallery
  </LinkTo>
  ```

  This may be helpful for keeping links active for:

  * non-nested routes that are logically related
  * some secondary menu approaches
  * 'top navigation' with 'sub navigation' scenarios

  A link will be active if `current-when` is `true` or the current
  route is the route this link would transition to.

  To match multiple routes 'space-separate' the routes:

  ```handlebars
  <LinkTo @route='gallery' @current-when='photos drawings paintings'>
    Art Gallery
  </LinkTo>
  ```

  ### Supplying a model

  An optional `model` argument can be used for routes whose
  paths contain dynamic segments. This argument will become
  the model context of the linked route:

  ```javascript
  Router.map(function() {
    this.route("photoGallery", {path: "hamster-photos/:photo_id"});
  });
  ```

  ```handlebars
  <LinkTo @route='photoGallery' @model={{this.aPhoto}}>
    {{aPhoto.title}}
  </LinkTo>
  ```

  ```html
  <a href="/hamster-photos/42">
    Tomster
  </a>
  ```

  ### Supplying multiple models

  For deep-linking to route paths that contain multiple
  dynamic segments, the `models` argument can be used.

  As the router transitions through the route path, each
  supplied model argument will become the context for the
  route with the dynamic segments:

  ```javascript
  Router.map(function() {
    this.route("photoGallery", { path: "hamster-photos/:photo_id" }, function() {
      this.route("comment", {path: "comments/:comment_id"});
    });
  });
  ```

  This argument will become the model context of the linked route:

  ```handlebars
  <LinkTo @route='photoGallery.comment' @models={{array this.aPhoto this.comment}}>
    {{comment.body}}
  </LinkTo>
  ```

  ```html
  <a href="/hamster-photos/42/comments/718">
    A+++ would snuggle again.
  </a>
  ```

  ### Supplying an explicit dynamic segment value

  If you don't have a model object available to pass to `LinkTo`,
  an optional string or integer argument can be passed for routes whose
  paths contain dynamic segments. This argument will become the value
  of the dynamic segment:

  ```javascript
  Router.map(function() {
    this.route("photoGallery", { path: "hamster-photos/:photo_id" });
  });
  ```

  ```handlebars
  <LinkTo @route='photoGallery' @model={{aPhotoId}}>
    {{this.aPhoto.title}}
  </LinkTo>
  ```

  ```html
  <a href="/hamster-photos/42">
    Tomster
  </a>
  ```

  When transitioning into the linked route, the `model` hook will
  be triggered with parameters including this passed identifier.

  ### Supplying query parameters

  If you need to add optional key-value pairs that appear to the right of the ? in a URL,
  you can use the `query` argument.

  ```handlebars
  <LinkTo @route='photoGallery' @query={{hash page=1 per_page=20}}>
    Great Hamster Photos
  </LinkTo>
  ```

  This will result in:

  ```html
  <a href="/hamster-photos?page=1&per_page=20">
    Great Hamster Photos
  </a>
  ```

  @for Ember.Templates.components
  @method LinkTo
  @public
*/

/**
  @module @ember/routing
*/

/**
  See [Ember.Templates.components.LinkTo](/ember/release/classes/Ember.Templates.components/methods/input?anchor=LinkTo).

  @for Ember.Templates.helpers
  @method link-to
  @see {Ember.Templates.components.LinkTo}
  @public
**/

/**
  An opaque interface which can be imported and used in strict-mode
  templates to call <LinkTo>.

  See [Ember.Templates.components.LinkTo](/ember/release/classes/Ember.Templates.components/methods/input?anchor=LinkTo).

  @for @ember/routing
  @method LinkTo
  @see {Ember.Templates.components.LinkTo}
  @public
**/

class LinkTo extends InternalComponent {
  static toString(): string {
    return 'LinkTo';
  }

  @service('-routing') private declare routing: RoutingService<Route>;

  validateArguments(): void {
    assert(
      'You attempted to use the <LinkTo> component within a routeless engine, this is not supported. ' +
        'If you are using the ember-engines addon, use the <LinkToExternal> component instead. ' +
        'See https://ember-engines.com/docs/links for more info.',
      !this.isEngine || this.engineMountPoint !== undefined
    );

    assert(
      'You must provide at least one of the `@route`, `@model`, `@models` or `@query` arguments to `<LinkTo>`.',
      'route' in this.args.named ||
        'model' in this.args.named ||
        'models' in this.args.named ||
        'query' in this.args.named
    );

    assert(
      'You cannot provide both the `@model` and `@models` arguments to the <LinkTo> component.',
      !('model' in this.args.named && 'models' in this.args.named)
    );

    super.validateArguments();
  }

  get class(): string {
    let classes = 'ember-view';

    if (this.isActive) {
      classes += this.classFor('active');

      if (this.willBeActive === false) {
        classes += ' ember-transitioning-out';
      }
    } else if (this.willBeActive) {
      classes += ' ember-transitioning-in';
    }

    if (this.isLoading) {
      classes += this.classFor('loading');
    }

    if (this.isDisabled) {
      classes += this.classFor('disabled');
    }

    return classes;
  }

  get href() {
    if (this.isLoading) {
      return '#';
    }

    let { routing, route, models, query } = this;

    assert('[BUG] route can only be missing if isLoading is true', isPresent(route));

    // consume the current router state so we invalidate when QP changes
    // TODO: can we narrow this down to QP changes only?
    consumeTag(tagFor(routing, 'currentState'));

    if (DEBUG) {
      try {
        return routing.generateURL(route, models, query);
      } catch (e) {
        let details = e instanceof Error ? e.message : inspect(e);
        let message = `While generating link to route "${route}": ${details}`;
        if (e instanceof Error) {
          e.message = message;
          throw e;
        } else {
          throw message;
        }
      }
    } else {
      return routing.generateURL(route, models, query);
    }
  }

  @action click(event: Event): void {
    if (!isSimpleClick(event)) {
      return;
    }

    let element = event.currentTarget;
    assert('[BUG] must be an <a> element', element instanceof HTMLAnchorElement);

    let isSelf = element.target === '' || element.target === '_self';

    if (isSelf) {
      this.preventDefault(event);
    } else {
      return;
    }

    if (this.isDisabled) {
      return;
    }

    if (this.isLoading) {
      warn(
        'This link is in an inactive loading state because at least one of its models ' +
          'currently has a null/undefined value, or the provided route name is invalid.',
        false,
        {
          id: 'ember-glimmer.link-to.inactive-loading-state',
        }
      );

      return;
    }

    let { routing, route, models, query, replace } = this;

    let payload = {
      routeName: route,
      queryParams: query,
      transition: undefined as Transition | undefined,
    };

    flaggedInstrument('interaction.link-to', payload, () => {
      assert('[BUG] route can only be missing if isLoading is true', isPresent(route));

      payload.transition = routing.transitionTo(route, models, query, replace);
    });
  }

  private get route(): Maybe<string> {
    if ('route' in this.args.named) {
      let route = this.named('route');

      assert(
        'The `@route` argument to the <LinkTo> component must be a string',
        isMissing(route) || typeof route === 'string'
      );

      return route && this.namespaceRoute(route);
    } else {
      return this.currentRoute;
    }
  }

  // GH #17963
  private currentRouteCache = createCache<Maybe<string>>(() => {
    consumeTag(tagFor(this.routing, 'currentState'));
    return untrack(() => this.routing.currentRouteName);
  });

  private get currentRoute(): Maybe<string> {
    return getValue(this.currentRouteCache);
  }

  // TODO: not sure why generateURL takes {}[] instead of unknown[]
  private get models(): {}[] {
    if ('models' in this.args.named) {
      let models = this.named('models');

      assert(
        'The `@models` argument to the <LinkTo> component must be an array.',
        Array.isArray(models)
      );

      return models;
    } else if ('model' in this.args.named) {
      return [this.named('model') as {}];
    } else {
      return EMPTY_ARRAY;
    }
  }

  private get query(): Record<string, unknown> {
    if ('query' in this.args.named) {
      let query = this.named('query');

      assert(
        'The `@query` argument to the <LinkTo> component must be an object.',
        query !== null && typeof query === 'object'
      );

      return { ...query };
    } else {
      return EMPTY_QUERY_PARAMS;
    }
  }

  private get replace(): boolean {
    return this.named('replace') === true;
  }

  private get isActive(): boolean {
    return this.isActiveForState(this.routing.currentState as Maybe<RouterState<Route>>);
  }

  private get willBeActive(): Option<boolean> {
    let current = this.routing.currentState as Maybe<RouterState<Route>>;
    let target = this.routing.targetState as Maybe<RouterState<Route>>;

    if (current === target) {
      return null;
    } else {
      return this.isActiveForState(target);
    }
  }

  private get isLoading(): boolean {
    return isMissing(this.route) || this.models.some((model) => isMissing(model));
  }

  private get isDisabled(): boolean {
    return Boolean(this.named('disabled'));
  }

  private get isEngine(): boolean {
    let owner = this.owner;
    return owner instanceof EngineInstance && getEngineParent(owner) !== undefined;
  }

  private get engineMountPoint(): string | undefined {
    let owner = this.owner;
    return owner instanceof EngineInstance ? owner.mountPoint : undefined;
  }

  private classFor(state: 'active' | 'loading' | 'disabled'): string {
    let className = this.named(`${state}Class`);

    assert(
      `The \`@${state}Class\` argument to the <LinkTo> component must be a string or boolean`,
      isMissing(className) || typeof className === 'string' || typeof className === 'boolean'
    );

    if (className === true || isMissing(className)) {
      return ` ${state}`;
    } else if (className) {
      return ` ${className}`;
    } else {
      return '';
    }
  }

  private namespaceRoute(route: string): string {
    let { engineMountPoint } = this;

    if (engineMountPoint === undefined) {
      return route;
    } else if (route === 'application') {
      return engineMountPoint;
    } else {
      return `${engineMountPoint}.${route}`;
    }
  }

  private isActiveForState(state: Maybe<RouterState<Route>>): boolean {
    if (!isPresent(state)) {
      return false;
    }

    if (this.isLoading) {
      return false;
    }

    let currentWhen = this.named('current-when');

    if (typeof currentWhen === 'boolean') {
      return currentWhen;
    } else if (typeof currentWhen === 'string') {
      let { models, routing } = this;

      return currentWhen
        .split(' ')
        .some((route) =>
          routing.isActiveForRoute(models, undefined, this.namespaceRoute(route), state)
        );
    } else {
      let { route, models, query, routing } = this;

      assert('[BUG] route can only be missing if isLoading is true', isPresent(route));

      return routing.isActiveForRoute(models, query, route, state);
    }
  }

  private preventDefault(event: Event): void {
    event.preventDefault();
  }

  protected isSupportedArgument(name: string): boolean {
    let supportedArguments = [
      'route',
      'model',
      'models',
      'query',
      'replace',
      'disabled',
      'current-when',
      'activeClass',
      'loadingClass',
      'disabledClass',
    ];

    return supportedArguments.indexOf(name) !== -1 || super.isSupportedArgument(name);
  }
}

let { prototype } = LinkTo;

let descriptorFor = (target: object, property: string): Option<PropertyDescriptor> => {
  if (target) {
    return (
      Object.getOwnPropertyDescriptor(target, property) ||
      descriptorFor(Object.getPrototypeOf(target), property)
    );
  } else {
    return null;
  }
};

// @href
{
  let superOnUnsupportedArgument = prototype['onUnsupportedArgument'];

  Object.defineProperty(prototype, 'onUnsupportedArgument', {
    configurable: true,
    enumerable: false,
    value: function onUnsupportedArgument(this: LinkTo, name: string): void {
      if (name === 'href') {
        assert(`Passing the \`@href\` argument to <LinkTo> is not supported.`);
      } else {
        superOnUnsupportedArgument.call(this, name);
      }
    },
  });
}

// QP
{
  let superModelsDescriptor = descriptorFor(prototype, 'models');

  assert(
    `[BUG] expecting models to be a getter on <LinkTo>`,
    superModelsDescriptor && typeof superModelsDescriptor.get === 'function'
  );

  let superModelsGetter = superModelsDescriptor.get as (this: LinkTo) => {}[];

  Object.defineProperty(prototype, 'models', {
    configurable: true,
    enumerable: false,
    get: function models(this: LinkTo): {}[] {
      let models = superModelsGetter.call(this);

      if (models.length > 0 && !('query' in this.args.named)) {
        if (isQueryParams(models[models.length - 1])) {
          models = models.slice(0, -1);
        }
      }

      return models;
    },
  });

  let superQueryDescriptor = descriptorFor(prototype, 'query');

  assert(
    `[BUG] expecting query to be a getter on <LinkTo>`,
    superQueryDescriptor && typeof superQueryDescriptor.get === 'function'
  );

  let superQueryGetter = superQueryDescriptor.get as (this: LinkTo) => {};

  Object.defineProperty(prototype, 'query', {
    configurable: true,
    enumerable: false,
    get: function query(this: LinkTo): {} {
      if ('query' in this.args.named) {
        let qp = superQueryGetter.call(this);

        if (isQueryParams(qp)) {
          return qp.values ?? EMPTY_QUERY_PARAMS;
        } else {
          return qp;
        }
      } else {
        let models = superModelsGetter.call(this);

        if (models.length > 0) {
          let qp = models[models.length - 1];

          if (isQueryParams(qp) && qp.values !== null) {
            return qp.values;
          }
        }

        return EMPTY_QUERY_PARAMS;
      }
    },
  });
}

// Positional Arguments
{
  let superOnUnsupportedArgument = prototype['onUnsupportedArgument'];

  Object.defineProperty(prototype, 'onUnsupportedArgument', {
    configurable: true,
    enumerable: false,
    value: function onUnsupportedArgument(this: LinkTo, name: string): void {
      if (name !== 'params') {
        superOnUnsupportedArgument.call(this, name);
      }
    },
  });
}

export default opaquify(LinkTo, LinkToTemplate);
