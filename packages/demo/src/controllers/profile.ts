import Controller, { type ControllerQueryParam } from '@ember/controller';
import { tracked } from '@glimmer/tracking';
import type RouterService from '@ember/routing/router-service';
import { service } from '@ember/service';


export class ProfileController extends Controller {
  queryParams: readonly ControllerQueryParam[] = ['q'];
  @tracked
  q = 12;
  @tracked now = new Date().toISOString();
  @service router!: RouterService;

  onInputChange = ( e) => {
    console.log('onInputChange', e);
  }
  toMain = () => {
    this.router.transitionTo('main');
  };

  incrementQp = () => {
    this.q++;
  };

  decrementQp = () => {
    this.q--;
  };

  constructor(...args: ConstructorParameters<typeof Controller>) {
    super(...args);
    // cellFor(this, 'now').update(new Date().toISOString());
    setInterval(() => {
      this.now = new Date().toISOString();
    }, 1000);
  }
}
