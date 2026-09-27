import Component from '@glimmer/component';
import { fn } from '@ember/helper';
import { service } from '@ember/service';

export class TheTable extends Component {
  @service state;

/**
 * We currently don't have a way to emit HTML with no invisible characters
 * and have the template look nice. 
 */
  <template>
    <table class="table table-hover table-striped test-data">
      <tbody>
        {{#each this.state.data as |row|}}
          <tr class={{if (this.state.isSelected row) "danger"}}><td
              class="col-md-1"
            >{{row.id}}</td><td class="col-md-4"><a data-test-select
                onclick={{fn this.state.select row}}
              >{{row.label.current}}</a></td><td class="col-md-1"><a data-test-remove
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