import Component from '@glimmer/component';
import { service } from '@ember/service';

export const PaddedButton = <template>
  <div class="col-sm-6 smallpad">
    <button
      type="button"
      class="btn btn-primary btn-block"
      ...attributes
    >{{yield}}</button>
  </div>
</template>;

export class Jumbotron extends Component {
  @service state;

  <template>
    <div class="jumbotron">
      <div class="row">
        <div class="col-md-6">
          <h1>Ember (keyed)</h1>
        </div>
        <div class="col-md-6">
          <div class="row">
            <PaddedButton id="run" onclick={{this.state.create}}>
              Create 1,000 rows
            </PaddedButton>
            <PaddedButton id="runlots" onclick={{this.state.runLots}}>
              Create 10,000 rows
            </PaddedButton>
            <PaddedButton id="add" onclick={{this.state.add}}>
              Append 1,000 rows
            </PaddedButton>
            <PaddedButton id="update" onclick={{this.state.update}}>
              Update every 10th row
            </PaddedButton>
            <PaddedButton id="clear" onclick={{this.state.clear}}>
              Clear
            </PaddedButton>
            <PaddedButton id="swaprows" onclick={{this.state.swapRows}}>
              Swap Rows
            </PaddedButton>
          </div>
        </div>
      </div>
    </div>
  </template>
}