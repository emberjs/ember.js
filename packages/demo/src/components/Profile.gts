import { Component } from '@lifeart/gxt';
import { Input } from '@ember/-internals/glimmer';

export default class ProfileTemplate extends Component {
  <template>
    Profile {{this.now}} [{{this.q}}]
    {{#each @model as |item|}}
      {{item}}
    {{/each}}
    {{yield}}
    <Input @value="12" {{on "change" this.onInputChange}} />
    <button type="button" {{on "click" this.toMain}}>to main</button>
    <button type="button" {{on "click" this.incrementQp}}>+ qp</button>
    <button type="button" {{on "click" this.decrementQp}}>- qp</button>
  </template>
}
