import Environment from '../environment';
import { Destructor, DROP, destructor, snapshot } from './destructor';

export const LINKED: WeakMap<object, Set<Destructor>> = new WeakMap();

export function associate(parent: object, child: object) {
  let associated = LINKED.get(parent);

  if (!associated) {
    associated = new Set();
    LINKED.set(parent, associated);
  }

  associated.add(destructor(child));
}

export function destroyAssociated(parent: object) {
  let associated = LINKED.get(parent);

  if (associated) {
    for (let item of associated) {
      item[DROP]();
      associated.delete(item);
    }
  }
}

export function asyncReset(parent: object, env: Environment) {
  let linked = LINKED.get(parent);

  if (linked && linked.size > 0) {
    LINKED.delete(parent);
    env.didDestroy(snapshot(linked));
  }
}

export function asyncDestroy(parent: object, env: Environment) {
  env.didDestroy(destructor(parent));
}
