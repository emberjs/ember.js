import Ember from 'ember';
import { expectTypeOf } from 'expect-type';

class AuthService extends Ember.Service {
  declare isAuthenticated: boolean;
}

class ApplicationController extends Ember.Controller {
  model = {};
  declare string: string;
  transitionToLogin() {}
}

declare module '@ember/service' {
  interface Registry {
    auth: AuthService;
  }
}

declare module '@ember/controller' {
  interface Registry {
    emberApplication: ApplicationController;
  }
}

class LoginRoute extends Ember.Route {
  @Ember.inject.service('auth')
  declare auth: AuthService;

  @Ember.inject.controller('emberApplication')
  declare application: ApplicationController;

  didTransition() {
    if (!this.get('auth').get('isAuthenticated')) {
      this.get('application').transitionToLogin();
    }
  }

  anyOldMethod() {
    this.get('application').set('string', 'must be a string');
    expectTypeOf(this.controllerFor('emberApplication')).toEqualTypeOf<Controller>();
  }
}

// New module injection style.
import RouterService from '@ember/routing/router-service';
import Controller from '@ember/controller';

class ComponentInjection extends Ember.Component {
  @Ember.inject.controller('emberApplication')
  declare applicationController: ApplicationController;

  @Ember.inject.service('auth')
  declare auth: AuthService;

  @Ember.inject.service('router')
  declare router: RouterService;

  @Ember.inject.service
  declare misc: Ember.Service;

  testem() {
    expectTypeOf(this.misc).toEqualTypeOf<Ember.Service>();

    const url = this.router.urlFor('some-route', 1, 2, 3, {
      queryParams: { seriously: 'yes' },
    });
    expectTypeOf(url).toBeString();
    if (!this.get('auth').isAuthenticated) {
      this.get('applicationController').transitionToLogin();
    }
  }
}
