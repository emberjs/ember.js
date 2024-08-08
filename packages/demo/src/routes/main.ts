import Route from '@ember/routing/route';

export class MainRoute extends Route {
  model() {
    return ['foo', 'boo', 'blue'];
  }
}
