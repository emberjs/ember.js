import Environment from './environment';
import { takeAssociated, snapshot, destructor, LINKED } from '@glimmer/util';
import { DEBUG } from '@glimmer/local-debug-flags';

export function asyncReset(parent: object, env: Environment) {
  let linked = takeAssociated(parent);

  if (linked) {
    env.didDestroy(snapshot(linked));
  }
}

export function asyncDestroy(parent: object, env: Environment) {
  if (DEBUG) {
    console.log('asyncDestroy', parent, LINKED.get(parent));
  }

  env.didDestroy(destructor(parent));
}
