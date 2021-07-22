import { Owner } from '@ember/-internals/owner';
import { RouterState, RoutingService } from '@ember/-internals/routing';
import { QueryParam } from '@ember/-internals/routing/lib/system/router';
import { TargetActionSupport } from '@ember/-internals/runtime';
import { isSimpleClick } from '@ember/-internals/views';
import { EMBER_MODERNIZED_BUILT_IN_COMPONENTS } from '@ember/canary-features';
import { assert, debugFreeze, deprecate, warn } from '@ember/debug';
import { JQUERY_INTEGRATION } from '@ember/deprecated-features';
import { EngineInstance, getEngineParent } from '@ember/engine';
import { flaggedInstrument } from '@ember/instrumentation';
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import { DEBUG } from '@glimmer/env';
import { Maybe, Option } from '@glimmer/interfaces';
import { consumeTag, createCache, getValue, tagFor, untrack } from '@glimmer/validator';
import { Transition } from 'router_js';
import Component from '../component';
import LinkToTemplate from '../templates/link-to';
import LegacyLinkTo from './-link-to';
import InternalComponent, {
  DeprecatingInternalComponent,
  handleDeprecatedArguments,
  handleDeprecatedAttributeArguments,
  handleDeprecatedEventArguments,
  jQueryEventShim,
  opaquify,
} from './internal';

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

class LinkTo extends InternalComponent implements DeprecatingInternalComponent {
  static toString(): string {
    return 'LinkTo';
  }

  modernized = this.shouldModernize();

  @service('-routing') private declare routing: RoutingService;

  validateArguments(): void {
    assert(
      'You attempted to use the <LinkTo> component within a routeless engine, this is not supported. ' +
        'If you are using the ember-engines addon, use the <LinkToExternal> component instead. ' +
        'See https://ember-engines.com/docs/links for more info.',
      !this.modernized || !this.isEngine || this.engineMountPoint !== undefined
    );

    assert(
      'You must provide at least one of the `@route`, `@model`, `@models` or `@query` argument to `<LinkTo>`.',
      !this.modernized ||
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
        // tslint:disable-next-line:max-line-length
        e.message = `While generating link to route "${route}": ${e.message}`;
        throw e;
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

      // TODO: is the signature wrong? this.query is definitely NOT a QueryParam!
      payload.transition = routing.transitionTo(route, models, query as QueryParam, replace);
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

  // TODO: this should probably be Record<string, unknown> or something
  private get query(): {} {
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
    return this.isActiveForState(this.routing.currentState as Maybe<RouterState>);
  }

  private get willBeActive(): Option<boolean> {
    let current = this.routing.currentState as Maybe<RouterState>;
    let target = this.routing.targetState as Maybe<RouterState>;

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
    return getEngineParent(this.owner as EngineInstance) !== undefined;
  }

  private get engineMountPoint(): string | undefined {
    return (this.owner as Owner | EngineInstance).mountPoint;
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

  private isActiveForState(state: Maybe<RouterState>): boolean {
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

      // TODO: is the signature wrong? this.query is definitely NOT a QueryParam!
      return routing.isActiveForRoute(models, query as QueryParam, route, state);
    }
  }

  private preventDefault(event: Event): void {
    event.preventDefault();
  }

  private shouldModernize(): boolean {
    return (
      Boolean(EMBER_MODERNIZED_BUILT_IN_COMPONENTS) &&
      Component._wasReopened === false &&
      TargetActionSupport._wasReopened === false &&
      LegacyLinkTo._wasReopened === false
    );
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

// Deprecated features
if (EMBER_MODERNIZED_BUILT_IN_COMPONENTS) {
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

  handleDeprecatedArguments(LinkTo);

  handleDeprecatedAttributeArguments(LinkTo, [
    // Component
    'id',
    ['id', 'elementId'],
    'class',
    ['class', 'classNames'],
    ['role', 'ariaRole'],

    // LinkTo
    'title',
    'rel',
    'tabindex',
    'target',
  ]);

  handleDeprecatedEventArguments(LinkTo);

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

  // @tagName
  {
    let superOnUnsupportedArgument = prototype['onUnsupportedArgument'];

    Object.defineProperty(prototype, 'onUnsupportedArgument', {
      configurable: true,
      enumerable: false,
      value: function onUnsupportedArgument(this: LinkTo, name: string): void {
        if (name === 'tagName') {
          let tagName = this.named('tagName');

          deprecate(
            `Passing the \`@tagName\` argument to <LinkTo> is deprecated. Using a <${tagName}> ` +
              'element for navigation is not recommended as it creates issues with assistive ' +
              'technologies. Remove this argument to use the default <a> element. In the rare ' +
              'cases that calls for using a different element, refactor to use the router ' +
              'service inside a custom event handler instead.',
            false,
            {
              id: 'ember.link-to.tag-name',
              for: 'ember-source',
              since: {},
              until: '4.0.0',
            }
          );

          this.modernized = false;
        } else {
          superOnUnsupportedArgument.call(this, name);
        }
      },
    });
  }

  // @bubbles & @preventDefault
  {
    let superIsSupportedArgument = prototype['isSupportedArgument'];

    Object.defineProperty(prototype, 'isSupportedArgument', {
      configurable: true,
      enumerable: false,
      value: function isSupportedArgument(this: LinkTo, name: string): boolean {
        if (this.modernized) {
          if (name === 'bubbles') {
            deprecate(
              'Passing the `@bubbles` argument to <LinkTo> is deprecated. ' +
                'Use the {{on}} modifier to attach a custom event handler to ' +
                'control event propagation.',
              false,
              {
                id: 'ember.built-in-components.legacy-arguments',
                for: 'ember-source',
                since: {
                  enabled: '3.27.0',
                },
                until: '4.0.0',
                url:
                  'https://deprecations.emberjs.com/v3.x#toc_ember-built-in-components-legacy-arguments',
              }
            );

            return true;
          }

          if (name === 'preventDefault') {
            deprecate(
              'Passing the `@preventDefault` argument to <LinkTo> is deprecated. ' +
                '`preventDefault()` is called automatically on events that are ' +
                'handled by the <LinkTo> component to prevent the browser from ' +
                'navigating away from the page.',
              false,
              {
                id: 'ember.built-in-components.legacy-arguments',
                for: 'ember-source',
                since: {
                  enabled: '3.27.0',
                },
                until: '4.0.0',
                url:
                  'https://deprecations.emberjs.com/v3.x#toc_ember-built-in-components-legacy-arguments',
              }
            );

            return true;
          }
        }

        return superIsSupportedArgument.call(this, name);
      },
    });

    Object.defineProperty(prototype, 'preventDefault', {
      configurable: true,
      enumerable: false,
      value: function preventDefault(this: LinkTo, event: Event): void {
        let shouldPreventDefault = true;
        let shouldStopPropagation = false;

        if ('preventDefault' in this.args.named) {
          let value = this.named('preventDefault');

          if (isMissing(value) || value) {
            deprecate(
              'Passing the `@preventDefault` argument to <LinkTo> is deprecated. ' +
                '`preventDefault()` is called automatically on events that are ' +
                'handled by the <LinkTo> component to prevent the browser from ' +
                'navigating away from the page.',
              false,
              {
                id: 'ember.built-in-components.legacy-arguments',
                for: 'ember-source',
                since: {
                  enabled: '3.27.0',
                },
                until: '4.0.0',
                url:
                  'https://deprecations.emberjs.com/v3.x#toc_ember-built-in-components-legacy-arguments',
              }
            );
          } else {
            deprecate(
              'Passing the `@preventDefault` argument to <LinkTo> is deprecated. ' +
                '`preventDefault()` should always be called on events that are ' +
                'handled by the <LinkTo> component to prevent the browser from ' +
                'navigating away from the page.',
              false,
              {
                id: 'ember.built-in-components.legacy-arguments',
                for: 'ember-source',
                since: {
                  enabled: '3.27.0',
                },
                until: '4.0.0',
                url:
                  'https://deprecations.emberjs.com/v3.x#toc_ember-built-in-components-legacy-arguments',
              }
            );

            shouldPreventDefault = false;
          }
        }

        if ('bubbles' in this.args.named) {
          let value = this.named('bubbles');

          if (value === false) {
            deprecate(
              'Passing the `@bubbles` argument to <LinkTo> is deprecated. ' +
                'Use the {{on}} modifier to attach a custom event handler to ' +
                'control event propagation.',
              false,
              {
                id: 'ember.built-in-components.legacy-arguments',
                for: 'ember-source',
                since: {
                  enabled: '3.27.0',
                },
                until: '4.0.0',
                url:
                  'https://deprecations.emberjs.com/v3.x#toc_ember-built-in-components-legacy-arguments',
              }
            );

            shouldStopPropagation = true;
          } else {
            deprecate(
              'Passing the `@bubbles` argument to <LinkTo> is deprecated. ' +
                '`stopPropagation()` is not automatically called so there is ' +
                'no need to pass this argument when you DO want the event to ' +
                'propagate normally',
              false,
              {
                id: 'ember.built-in-components.legacy-arguments',
                for: 'ember-source',
                since: {
                  enabled: '3.27.0',
                },
                until: '4.0.0',
                url:
                  'https://deprecations.emberjs.com/v3.x#toc_ember-built-in-components-legacy-arguments',
              }
            );
          }
        }

        if (shouldPreventDefault) {
          event.preventDefault();
        }

        if (shouldStopPropagation) {
          event.stopPropagation();
        }
      },
    });
  }

  // @disabledWhen
  {
    let superIsSupportedArgument = prototype['isSupportedArgument'];

    Object.defineProperty(prototype, 'isSupportedArgument', {
      configurable: true,
      enumerable: false,
      value: function isSupportedArgument(this: LinkTo, name: string): boolean {
        if (this.modernized) {
          if (name === 'disabledWhen') {
            deprecate(
              'Passing the `@disabledWhen` argument to <LinkTo> is deprecated. ' +
                'Use the `@disabled` argument instead.',
              false,
              {
                id: 'ember.link-to.disabled-when',
                for: 'ember-source',
                since: {},
                until: '4.0.0',
              }
            );

            return true;
          }
        }

        return superIsSupportedArgument.call(this, name);
      },
    });

    let superDescriptor = descriptorFor(prototype, 'isDisabled');

    assert(
      `[BUG] expecting isDisabled to be a getter on <LinkTo>`,
      superDescriptor && typeof superDescriptor.get === 'function'
    );

    let superGetter = superDescriptor.get as (this: LinkTo) => boolean;

    Object.defineProperty(prototype, 'isDisabled', {
      configurable: true,
      enumerable: false,
      get: function isDisabled(this: LinkTo): boolean {
        if ('disabledWhen' in this.args.named) {
          deprecate(
            'Passing the `@disabledWhen` argument to <LinkTo> is deprecated. ' +
              'Use the `@disabled` argument instead.',
            false,
            {
              id: 'ember.link-to.disabled-when',
              for: 'ember-source',
              since: {},
              until: '4.0.0',
            }
          );

          return Boolean(this.named('disabledWhen'));
        }

        return superGetter.call(this);
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
    let superValidateArguments = prototype['validateArguments'];

    Object.defineProperty(prototype, 'validateArguments', {
      configurable: true,
      enumerable: false,
      value: function validateArguments(this: LinkTo): void {
        if (this.args.positional.length !== 0 || 'params' in this.args.named) {
          // Already deprecated in the legacy implementation
          this.modernized = false;
        }

        superValidateArguments.call(this);
      },
    });

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
}

if (JQUERY_INTEGRATION) {
  jQueryEventShim(LinkTo);
}

export default opaquify(LinkTo, LinkToTemplate);
