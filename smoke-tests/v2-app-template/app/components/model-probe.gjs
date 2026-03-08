import Component from '@glimmer/component';

const destroyedModels = [];

export function getDestroyedModels() {
  return destroyedModels;
}

export function clearDestroyedModels() {
  destroyedModels.length = 0;
}

export default class ModelProbe extends Component {
  willDestroy() {
    super.willDestroy(...arguments);
    destroyedModels.push(this.args.model);
  }

  <template>{{@model}}</template>
}
