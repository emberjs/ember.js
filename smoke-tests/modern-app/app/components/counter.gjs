import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';
import { on } from '@ember/modifier';
import formatPrice from '../helpers/format-price.js';
import { tagged } from '../modifiers/tagged.js';
import ItemList from './item-list.gjs';

export default class Counter extends Component {
  @service cart;
  @tracked count = 0;

  increment = () => {
    this.count++;
    this.cart.add(`item-${this.count}`, this.count);
  };

  get doubled() {
    return this.count * 2;
  }

  // A bound URL in a camelCased URL attribute: rendered sanitized
  // (`unsafe:javascript:…`), as Glimmer does.
  formUrl = 'javascript:alert(1)';

  <template>
    <div class="counter" {{tagged @label}}>
      <p data-test-count>Count: {{this.count}} (x2 = {{this.doubled}})</p>
      <button type="button" data-test-increment {{on "click" this.increment}}>+1</button>
      <button type="submit" data-test-form-url formAction={{this.formUrl}}>submit</button>
      <p data-test-total>Total: {{formatPrice this.cart.total}}</p>
      <ItemList @items={{this.cart.items}} @showCount={{true}} />
    </div>
  </template>
}
