import { takeAssociated, peekAssociated, snapshot, destructor, LINKED } from '@glimmer/util';
import { DEBUG } from '@glimmer/local-debug-flags';
import { clear } from './bounds';
import { BlockOpcode } from './vm/update';
import { Option, Bounds, Environment } from '@glimmer/interfaces';
import { SimpleNode } from '@simple-dom/interface';

export function legacySyncReset(parent: object, env: Environment) {
  let linked = peekAssociated(parent);

  if (linked !== null) {
    env.willDestroy(snapshot(linked));
  }
}

export function asyncReset(parent: object, env: Environment) {
  let linked = takeAssociated(parent);

  if (linked !== null) {
    env.didDestroy(snapshot(linked));
  }
}

export function legacySyncDestroy(parent: object, env: Environment) {
  if (DEBUG) {
    console.log('legacySyncDestroy', parent, LINKED.get(parent));
  }

  env.willDestroy(destructor(parent));
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

  legacySyncDestroy(parent, env);
  clear(parent);
  asyncDestroy(parent, env);
}

export function detachChildren(parent: Bounds, env: Environment): Option<SimpleNode> {
  if (DEBUG) {
    console.log('asyncClear', parent, LINKED.get(parent));
  }

  legacySyncReset(parent, env);
  asyncReset(parent, env);
  return clear(parent);
}
