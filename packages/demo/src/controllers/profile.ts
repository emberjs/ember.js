import Controller, { ControllerQueryParam } from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import type RouterService from '@ember/routing/router-service';
import { service } from '@ember/service';


export class ProfileController extends Controller {
  queryParams: readonly ControllerQueryParam[] = ['q'];
  q = 12;
  @tracked now = new Date().toISOString();
  @service router!: RouterService;

  toMain = () => {
    this.router.transitionTo('main');
  };

  constructor(...args: ConstructorParameters<typeof Controller>) {
    super(...args);
    // cellFor(this, 'now').update(new Date().toISOString());
    setInterval(() => {
      this.now = new Date().toISOString();
    }, 1000);
  }
}
