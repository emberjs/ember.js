import { Component } from '@lifeart/gxt';

export default class ApplicationTemplate extends Component {
  <template>
    <div>
    Hello world - this is application template; {{(Date.now)}}
    {{#each @model as |item|}}
      {{item}}
    {{/each}}
    <div>place for outlet
      <div class="outlet">{{outlet}}</div>
    </div>
    </div>
  </template>
}
