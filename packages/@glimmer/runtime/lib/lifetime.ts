import Environment from './environment';
import { takeAssociated, snapshot, destructor, LINKED } from '@glimmer/util';
import { DEBUG } from '@glimmer/local-debug-flags';
import { clear } from './bounds';
import { BlockOpcode } from './vm/update';
import { Simple, Option, Bounds } from '@glimmer/interfaces';

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

export function detach(parent: BlockOpcode, env: Environment) {
  if (DEBUG) {
    console.log('asyncClear', parent, LINKED.get(parent));
  }

  clear(parent);
  asyncDestroy(parent, env);
}

export function detachChildren(parent: Bounds, env: Environment): Option<Simple.Node> {
  if (DEBUG) {
    console.log('asyncClear', parent, LINKED.get(parent));
  }

  asyncReset(parent, env);
  return clear(parent);
}
