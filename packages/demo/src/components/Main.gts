import { Component } from '@lifeart/gxt';

export default class MainTemplate extends Component {
  <template>
    <div>
    Hello world - this is main template;
    {{#each @model as |item|}}
      {{item}}
    {{/each}}
    <div>place for outlet
      <div class="outlet">{{yield}}</div>
    </div>
    </div>
  </template>
}
