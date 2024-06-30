import Route from '@ember/routing/route';

export class ApplicationRoute extends Route {

  async beforeModel() {

  }

  model() {
    return ['red', 'yellow', 'blue'];
  }
}
