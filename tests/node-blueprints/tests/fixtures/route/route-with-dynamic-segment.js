import Route from '@ember/routing/route';

export default class FooRoute extends Route {
  model(params) {
    // This route was generated with a dynamic segment. Implement data loading
    // based on that dynamic segment here in the model hook.
    return params;
  }
}
