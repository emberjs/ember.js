import Component from '@glimmer/component';
import { set } from '@ember/object';

// A .gjs component class with a plain (untracked) field, updated with `set()`:
// the template's read of `this.clicks` consumes the property's tag, as
// Glimmer's does, so `set()` re-renders it (the `EMBER_PROPERTY_TAGS`
// compiler flag in vite.config.mjs).
export default class SetCounter extends Component {
  clicks = 0;

  increment = () => {
    set(this, 'clicks', this.clicks + 1);
  };

  <template>
    <p data-test-set-counter>Set clicks: {{this.clicks}}</p>
    <button type="button" data-test-set-increment {{on "click" this.increment}}>+1 (set)</button>
  </template>
}
