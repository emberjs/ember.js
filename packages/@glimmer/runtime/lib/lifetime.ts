import Environment from './environment';
import { takeAssociated, snapshot, destructor } from '@glimmer/util';

export function asyncReset(parent: object, env: Environment) {
  let linked = takeAssociated(parent);

  if (linked) {
    env.didDestroy(snapshot(linked));
  }
}

export function asyncDestroy(parent: object, env: Environment) {
  env.didDestroy(destructor(parent));
}
