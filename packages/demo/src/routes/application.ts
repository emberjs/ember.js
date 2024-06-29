import Route from '@ember/routing/route';

export class ApplicationRoute extends Route {

  async beforeModel() {
    console.log('before model');
  }

  model() {
    console.log('model');
    return ['red', 'yellow', 'blue'];
  }
}
