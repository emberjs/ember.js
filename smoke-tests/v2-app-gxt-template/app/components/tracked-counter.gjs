import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { action } from '@ember/object';
import { service } from '@ember/service';

// A .gjs component class written with decorators, as an Ember app writes it:
// `@tracked` state, an `@action` method and an injected `@service`. The gxt
// compiler lowers the decorators to calls into decorator-transforms' runtime,
// which the module imports (vite.config.mjs), as an Embroider app's babel
// config makes it do.
export default class TrackedCounter extends Component {
  @service greeter;

  @tracked clicks = 0;

  @action
  increment() {
    this.clicks++;
  }

  <template>
    <p data-test-tracked-counter>{{this.greeter.label}}: {{this.clicks}}</p>
    <button type="button" data-test-tracked-increment {{on "click" this.increment}}>+1 (tracked)</button>
  </template>
}
