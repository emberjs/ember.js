// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
export const OWNER: unique symbol = Symbol('OWNER') as any;

interface OwnedObject<O extends object> {
  [OWNER]: O | undefined;
}

/**
  Framework objects in a Glimmer application may receive an owner object.
  Glimmer is unopinionated about this owner.
  If it is provided, Glimmer forwards it through its internal resolution system,
  and through its managers.
*/
export function getOwner(object: object): object | undefined {
  return (object as OwnedObject<object>)[OWNER];
}

/**
  `setOwner` set's an object's owner
*/
export function setOwner(object: object, owner: object): void {
  (object as OwnedObject<object>)[OWNER] = owner;
}
