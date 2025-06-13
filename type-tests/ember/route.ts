import Route from '@ember/routing/route';
import Array from '@ember/array';
import Ember from 'ember'; // currently needed for Transition
import { set } from '@ember/object';
import type Transition from '@ember/routing/transition';
import { expectTypeOf } from 'expect-type';
import { service } from '@ember/service';
import RouterService from '@ember/routing/router-service';

// Ensure that Ember.Transition is private
// @ts-expect-error
Ember.Transition;

interface Post extends Ember.Object {
  title: string;
}

interface Posts extends Array<Post> {}

class Test extends Route {
  @service declare router: RouterService;
  queryParams = {
    memberQp: { refreshModel: true },
  };

  beforeModel(transition: Transition) {
    this.router.transitionTo('someOtherRoute');
  }

  model() {
    return this.modelFor('post');
  }

  afterModel(posts: Posts, transition: Transition) {
    if (posts[0]) {
      this.router.transitionTo('post.show', posts[0]);
    }
  }

  setupController(controller: Ember.Controller, model: {}) {
    super.setupController(controller, model);
    set(this.controllerFor('application'), 'model', model);
  }

  resetController(controller: Ember.Controller, isExiting: boolean, transition: Transition) {
    if (isExiting) {
      //   controller.set('page', 1);
    }
  }

  intermediateTransitionWithoutModel() {
    this.intermediateTransitionTo('some-route');
  }
  intermediateTransitionWithModel() {
    this.intermediateTransitionTo('some.other.route', {});
  }
  intermediateTransitionWithMultiModel() {
    this.intermediateTransitionTo('some.other.route', 1, 2, {});
  }
}

class ReturningPromises extends Route {
  beforeModel() {
    return Promise.resolve('beforeModel can return promises');
  }
  afterModel(resolvedModel: unknown, transition: Transition) {
    return Promise.resolve('afterModel can also return promises');
  }
}

class WithNonReturningBeforeAndModelHooks extends Route {
  beforeModel(transition: Transition): void | Promise<unknown> {
    return;
  }

  afterModel(resolvedModel: unknown, transition: Transition): void {
    return;
  }
}

class WithBadReturningBeforeAndModelHooks extends Route {
  beforeModel(transition: Transition): void | Promise<unknown> {
    // @ts-expect-error
    return "returning anything else is nonsensical (if 'legal')";
  }

  afterModel(resolvedModel: unknown, transition: Transition): void {
    // @ts-expect-error
    return "returning anything else is nonsensical (if 'legal')";
  }
}

