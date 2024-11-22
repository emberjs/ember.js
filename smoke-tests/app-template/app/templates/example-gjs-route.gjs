import Component from '@glimmer/component';

export default class extends Component {
  get componentGetter() {
    return "I am on the component"
  }

  <template>
    <div data-test="model-field">{{@model.message}}</div>
    <div data-test="controller-field">{{@controller.exampleControllerField}}</div>
    <div data-test="component-getter">{{this.componentGetter}}</div>
  </template>
}
