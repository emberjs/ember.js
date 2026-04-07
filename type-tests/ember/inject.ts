import { expectTypeOf } from 'expect-type';

class AuthService extends Service {
  declare isAuthenticated: boolean;
}

class ApplicationController extends Controller {
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

class LoginRoute extends Route {
  @service('auth')
  declare auth: AuthService;

  @controller('emberApplication')
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
import Controller, { inject as controller } from '@ember/controller';
import Service from '@ember/service';
import Route from '@ember/routing/route';
import { service } from '@ember/service';
import Component from '@ember/component';

class ComponentInjection extends Component {
  @controller('emberApplication')
  declare applicationController: ApplicationController;

  @service('auth')
  declare auth: AuthService;

  @service('router')
  declare router: RouterService;

  @service
  declare misc: Service;

  testem() {
    expectTypeOf(this.misc).toEqualTypeOf<Service>();

    const url = this.router.urlFor('some-route', 1, 2, 3, {
      queryParams: { seriously: 'yes' },
    });
    expectTypeOf(url).toBeString();
    if (!this.get('auth').isAuthenticated) {
      this.get('applicationController').transitionToLogin();
    }
  }
}
