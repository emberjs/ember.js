import Router from '@ember/routing/router';
import Service, { inject as service } from '@ember/service';
import EmberObject, { get } from '@ember/object';
import RouterService from '@ember/routing/router-service';
import RouteInfo from '@ember/routing/route-info';

import { expectTypeOf } from 'expect-type';

const AppRouter = Router.extend({});

AppRouter.map(function () {
  this.route('index', { path: '/' });
  this.route('about');
  this.route('favorites', { path: '/favs' });
  this.route('posts', function () {
    this.route('index', { path: '/' });
    this.route('new');
    this.route('post', { path: '/post/:post_id', resetNamespace: true });
    this.route('comments', { resetNamespace: true }, function () {
      this.route('new');
    });
  });
  this.route('photo', { path: '/photo/:id' }, function () {
    this.route('comment', { path: '/comment/:id' });
  });
  this.route('not-found', { path: '/*path' });
  this.mount('my-engine');
  this.mount('my-engine', { as: 'some-other-engine', path: '/some-other-engine' });
});

class RouterServiceConsumer extends Service {
  @service('router') declare router: RouterService;
  currentRouteName() {
    expectTypeOf(get(this, 'router').currentRouteName).toEqualTypeOf<string>();
  }
  currentURL() {
    expectTypeOf(get(this, 'router').currentURL).toEqualTypeOf<string>();
  }
  rootURL() {
    expectTypeOf(get(this, 'router').rootURL).toEqualTypeOf<string>();
  }
  transitionWithoutModel() {
    get(this, 'router').transitionTo('some-route');
  }
  transitionWithModel() {
    const model = EmberObject.create();
    get(this, 'router').transitionTo('some.other.route', model);
  }
  transitionWithMultiModel() {
    const model = EmberObject.create();
    get(this, 'router').transitionTo('some.other.route', model, model);
  }
  transitionWithModelAndOptions() {
    const model = EmberObject.create();
    get(this, 'router').transitionTo('index', model, { queryParams: { search: 'ember' } });
  }
  onAndRouteInfo() {
    const router = get(this, 'router');
    router
      .on('routeWillChange', (transition) => {
        const to = transition.to;
        expectTypeOf(to.child).toEqualTypeOf<RouteInfo | null>();
        expectTypeOf(to.localName).toEqualTypeOf<string>();
        expectTypeOf(to.name).toEqualTypeOf<string>();
        expectTypeOf(to.paramNames).toEqualTypeOf<string[]>();
        expectTypeOf(to.params['foo']).toEqualTypeOf<string | undefined>();
        expectTypeOf(to.parent).toEqualTypeOf<RouteInfo | null>();
        expectTypeOf(to.queryParams['foo']).toEqualTypeOf<string | undefined>();
        expectTypeOf(to.find((info) => info.name === 'foo')).toEqualTypeOf<RouteInfo | undefined>();
      })
      .on('routeDidChange', (transition) => {
        const from = transition.from;
        if (from) {
          expectTypeOf(from.child).toEqualTypeOf<RouteInfo | null>();
          expectTypeOf(from.localName).toEqualTypeOf<string>();
          expectTypeOf(from.name).toEqualTypeOf<string>();
          expectTypeOf(from.paramNames).toEqualTypeOf<string[]>();
          expectTypeOf(from.params['foo']).toEqualTypeOf<string | undefined>();
          expectTypeOf(from.parent).toEqualTypeOf<RouteInfo | null>();
          expectTypeOf(from.queryParams['foo']).toEqualTypeOf<string | undefined>();
          expectTypeOf(from.find((info) => info.name === 'foo')).toEqualTypeOf<
            RouteInfo | undefined
          >();
        }
      });
  }
}
