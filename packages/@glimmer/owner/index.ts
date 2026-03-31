// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
export const OWNER: unique symbol = Symbol('OWNER') as any;

interface OwnedObject<O extends object> {
  [OWNER]: O | undefined;
}

const OWNER_STACK: Array<object | undefined> = [];

export function pushActiveOwner(owner: object | undefined): void {
  OWNER_STACK.push(owner);
}

export function popActiveOwner(): void {
  OWNER_STACK.pop();
}

/**
  Framework objects in a Glimmer application may receive an owner object.
  Glimmer is unopinionated about this owner, but will forward it through its
  internal resolution system, and through its managers if it is provided.
*/
export function getOwner(object?: object): object | undefined {
  if (object === undefined) {
    return OWNER_STACK[OWNER_STACK.length - 1];
  }
  return (object as OwnedObject<object>)[OWNER];
}

/**
  `setOwner` set's an object's owner
*/
export function setOwner(object: object, owner: object): void {
  (object as OwnedObject<object>)[OWNER] = owner;
}
