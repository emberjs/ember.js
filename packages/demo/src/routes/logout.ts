import Route from '@ember/routing/route';
import RouterService from '@ember/routing/router-service';
import Transition from '@ember/routing/transition';
import { service } from '@ember/service';

export default class LogoutRoute extends Route {
  @service router!: RouterService;

  async beforeModel(transition: Transition) {

    this.router.transitionTo('main');
  }
}
