/* eslint-disable @typescript-eslint/no-empty-interface */
/* eslint-disable prefer-const */
import Route from '@ember/routing/route';
import type Array from '@ember/array';
import EmberObject from '@ember/object';
import Controller from '@ember/controller';
import type Transition from '@ember/routing/transition';
import { expectTypeOf } from 'expect-type';
import { service } from '@ember/service';
import RouterService from '@ember/routing/router-service';

class Post extends EmberObject {}

interface Posts extends Array<Post> {}

class BeforeModelText extends Route {
  @service declare router: RouterService;
  beforeModel(transition: Transition) {
    this.router.transitionTo('someOtherRoute');
  }
}

class AfterModel extends Route {
  @service declare router: RouterService;
  afterModel(posts: Posts, transition: Transition) {
    if (posts.firstObject) {
      this.router.transitionTo('post.show', posts.firstObject);
    }
  }
}

class ModelTest extends Route {
  model() {
    return this.modelFor('post');
  }
}

class Model {
  baseClass = true;
}

class Child extends Model {
  baseClass = false;
  extraStuff = true;
}

class FooRoute<T extends Model> extends Route<T> {
  serialize(object: T): any {
    return null;
  }
}

class FooChildRoute extends FooRoute<Child> {
  serialize(object: Child) {
    return object.extraStuff;
  }
}

class QPsTest extends Route {
  queryParams = {
    memberQp: { refreshModel: true },
  };
}

class ResetControllerTest extends Route {
  resetController(controller: Controller, isExiting: boolean, transition: Transition) {
    if (isExiting) {
      //   controller.set('page', 1);
      transition.abort();
    }
  }
}

class ActivateRoute extends Route {
  @service declare router: RouterService;
  activate(transition: Transition) {
    this.router.transitionTo('someOtherRoute');
  }
}

class DeactivateRoute extends Route {
  @service declare router: RouterService;
  deactivate(transition: Transition) {
    this.router.transitionTo('someOtherRoute');
  }
}

class RedirectRoute extends Route {
  @service declare router: RouterService;
  redirect(model: {}, a: Transition) {
    if (!model) {
      this.router.transitionTo('there');
    }
  }
}

class InvalidRedirect extends Route {
  @service declare router: RouterService;
  // @ts-expect-error
  redirect(model: {}, a: Transition, anOddArg: unknown) {
    if (!model) {
      this.router.transitionTo('there');
    }
  }
}

class BuidlRouteInfoMetadata extends Route {
  buildRouteInfoMetadata() {
    return { foo: 'bar' };
  }
}

class ApplicationController extends Controller {}
declare module '@ember/controller' {
  interface Registry {
    application: ApplicationController;
  }
}

class SetupControllerTest extends Route {
  setupController(controller: Controller, model: {}, transition: Transition) {
    this._super(controller, model);
    this.controllerFor('application').set('model', model);
    transition.abort();
  }
}

const route = Route.create();
expectTypeOf(route.controllerFor('whatever')).toEqualTypeOf<Controller>();
expectTypeOf(route.paramsFor('whatever')).toEqualTypeOf<Record<string, unknown>>();

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

interface RouteParams {
  cool: string;
}

class WithParamsInModel extends Route<boolean> {
  model(params: { cool: string }, transition: Transition) {
    return true;
  }
}

// @ts-expect-error
class WithNonsenseParams extends Route<boolean, number> {}

class WithImplicitParams extends Route {
  model(params: { cool: string }) {
    return { whatUp: 'dog' };
  }
}
