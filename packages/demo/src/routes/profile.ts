import Route from '@ember/routing/route';
import type Transition from '@ember/routing/transition';
export default class ProfileRoute extends Route {
  // queryParams: Record<string, { refreshModel?: boolean; replace?: boolean; as?: string; }> = {
  //   q: {
  //     refreshModel: true,
  //     replace: true,
  //   }
  // }

  beforeModel(transition: Transition) {
    console.log('beforeModel:profile', transition);
  }

  model() {
    return [1, 2, 3];
  }
}
