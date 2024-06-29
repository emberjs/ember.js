import { Component } from '@lifeart/gxt';
import { LinkTo } from '@ember/routing';

console.log('link-to', LinkTo);

export default class MainTemplate extends Component {
  <template>
    <div>
    Hello world - this is main template;
    {{#each @model as |item|}}
      {{item}}
    {{/each}}
    <div>place for outlet
      <div class="outlet">{{outlet}}</div>
    </div>
    </div>
    <LinkTo @route="profile">Profile</LinkTo>
  </template>
}
