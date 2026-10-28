import Route from '@ember/routing/route';
import { service } from '@ember/service';

export default class AboutRoute extends Route {
  @service cart;

  model() {
    return { count: this.cart.items.length, owner: this.cart.owner };
  }
}
