import Component from '@glimmer/component';
import { fn } from '@ember/helper';
import { getOwner } from '@ember/owner';

export class TheTable extends Component {
    @service state;

  <template>
    <table class="table table-hover table-striped test-data">
      <tbody>
        {{#each this.state.data as |row|}}
          <tr class={{if (this.state.isSelected row) "danger"}}><td
              class="col-md-1"
            >{{row.id}}</td><td class="col-md-4"><a
                onclick={{fn this.state.select row}}
              >{{row.label.current}}</a></td><td class="col-md-1"><a
                onclick={{fn this.state.remove row}}
              ><span
                  class="glyphicon glyphicon-remove"
                  aria-hidden="true"
                /></a></td><td class="col-md-6" />
          </tr>
        {{/each}}
      </tbody>
    </table>
  </template>
}