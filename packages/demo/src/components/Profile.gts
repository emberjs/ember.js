import { Component } from '@lifeart/gxt';

export default class ProfileTemplate extends Component {
  <template>
    Profile {{this.now}}
    {{#each @model as |item|}}
      {{item}}
    {{/each}}
    {{yield}}
    <button type="button" {{on "click" this.toMain}}>to main</button>
  </template>
}
