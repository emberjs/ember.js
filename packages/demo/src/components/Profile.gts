import { Component } from '@lifeart/gxt';
import { Input } from '@ember/-internals/glimmer';
console.log('Input', Input);
export default class ProfileTemplate extends Component {
  <template>
    Profile {{this.now}} [{{this.q}}]
    {{#each @model as |item|}}
      {{item}}
    {{/each}}
    {{yield}}
    {{!-- <Input @value="12" /> --}}
    <button type="button" {{on "click" this.toMain}}>to main</button>
  </template>
}
