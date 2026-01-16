import RouterService from '@ember/routing/router-service';
import { expectTypeOf } from 'expect-type';
import Router from '@ember/routing/router';
import Service, { service } from '@ember/service';
import EmberObject, { get } from '@ember/object';

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
  @service('router')
  declare router: RouterService;

  currentRouteName() {
    expectTypeOf(this.router.currentRouteName).toEqualTypeOf<string | null>();
  }
  currentURL() {
    expectTypeOf(this.router.currentURL).toEqualTypeOf<string | null>();
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
}
