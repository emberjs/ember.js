import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { on } from '@ember/modifier';

// A list keyed by position and an each-in. Both replace their source on update:
// a positional row stays in place and shows the item now at its position (its
// DOM node is kept), an each-in row is keyed by its entry.
export default class PositionalLists extends Component {
  @tracked items = ['apple', 'pear', 'plum'];
  @tracked scores = { ann: 1, bob: 2 };

  shift = () => {
    this.items = this.items.slice(1);
  };

  addScore = () => {
    this.scores = { ...this.scores, cid: 3 };
  };

  <template>
    <ul data-test-positional>
      {{#each this.items key="@index" as |item index|}}
        <li>{{index}}: {{item}}</li>
      {{/each}}
    </ul>
    <ul data-test-each-in>
      {{#each-in this.scores as |name score|}}
        <li>{{name}}={{score}}</li>
      {{/each-in}}
    </ul>
    <button type="button" data-test-shift {{on "click" this.shift}}>shift</button>
    <button type="button" data-test-add-score {{on "click" this.addScore}}>add</button>
  </template>
}
