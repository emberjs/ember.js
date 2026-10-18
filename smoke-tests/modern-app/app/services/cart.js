import Service from '@ember/service';
import { tracked } from '@glimmer/tracking';
import { trackedArray } from '@ember/reactive/collections';

export default class CartService extends Service {
  @tracked owner = 'guest';
  items = trackedArray([{ name: 'apple', price: 1.5 }]);

  add(name, price) {
    this.items.push({ name, price });
  }

  get total() {
    return this.items.reduce((sum, item) => sum + item.price, 0);
  }
}
