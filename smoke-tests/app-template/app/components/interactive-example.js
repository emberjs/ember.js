import { template } from '@ember/template-compiler';
import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { on } from '@ember/modifier';

export default class extends Component {
  @tracked
  message = 'Hello';

  static {
    template("<div class='interactive-example' {{on 'click' this.louder}}>{{this.message}}</div>", {
      component: this,
      scope: () => ({ on })
    })
  }

  louder = () => {
    this.message = this.message + '!';
  }

}
