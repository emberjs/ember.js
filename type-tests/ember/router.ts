import RouterService from '@ember/routing/router-service';
import Ember from 'ember';
import { expectTypeOf } from 'expect-type';

const AppRouter = Ember.Router.extend({});

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

class RouterServiceConsumer extends Ember.Service {
  @Ember.inject.service('router')
  declare router: RouterService;

  currentRouteName() {
    expectTypeOf(this.router.currentRouteName).toEqualTypeOf<string | null>();
  }
  currentURL() {
    expectTypeOf(this.router.currentURL).toEqualTypeOf<string | null>();
  }
  transitionWithoutModel() {
    Ember.get(this, 'router').transitionTo('some-route');
  }
  transitionWithModel() {
    const model = Ember.Object.create();
    Ember.get(this, 'router').transitionTo('some.other.route', model);
  }
  transitionWithMultiModel() {
    const model = Ember.Object.create();
    Ember.get(this, 'router').transitionTo('some.other.route', model, model);
  }
  transitionWithModelAndOptions() {
    const model = Ember.Object.create();
    Ember.get(this, 'router').transitionTo('index', model, { queryParams: { search: 'ember' } });
  }
}
