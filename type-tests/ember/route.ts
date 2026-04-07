import Route from '@ember/routing/route';
import Array from '@ember/array';

import type Transition from '@ember/routing/transition';
import { expectTypeOf } from 'expect-type';
import { service } from '@ember/service';
import RouterService from '@ember/routing/router-service';
import type EmberObject from '@ember/object';
import type Controller from '@ember/controller';

interface Post extends EmberObject {
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
    if (posts.firstObject) {
      this.router.transitionTo('post.show', posts.firstObject);
    }
  }

  setupController(controller: Controller, model: {}) {
    this._super(controller, model);
    this.controllerFor('application').set('model', model);
  }

  resetController(controller: Controller, isExiting: boolean, transition: Transition) {
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

class HasEvented extends Route {
  methodUsingEvented() {
    this.on('some-event', this, 'aMethod');
  }

  aMethod() {}
}

class HasActionHandler extends Route {
  methodUsingActionHandler() {
    expectTypeOf(this.actions).toEqualTypeOf<Record<string, (...args: any[]) => any>>();
  }
}
