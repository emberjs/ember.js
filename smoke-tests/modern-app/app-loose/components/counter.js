import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { service } from '@ember/service';
import { precompileTemplate } from '@ember/template-compilation';
import { setComponentTemplate } from '@ember/component';

class Counter extends Component {
  @service cart;
  @tracked count = 0;

  increment = () => {
    this.count++;
    this.cart.add(`item-${this.count}`, this.count);
  };

  get doubled() {
    return this.count * 2;
  }
}

export default setComponentTemplate(
  precompileTemplate(
    `<div class="counter" {{tagged @label}}>
      <p data-test-count>Count: {{this.count}} (x2 = {{this.doubled}})</p>
      <button type="button" data-test-increment {{on "click" this.increment}}>+1</button>
      <p data-test-total>Total: {{format-price this.cart.total}}</p>
      <ItemList @items={{this.cart.items}} @showCount={{true}} />
    </div>`
  ),
  Counter
);
