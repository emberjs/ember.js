// eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-assignment
export const OWNER: unique symbol = Symbol('OWNER') as any;

interface OwnedObject<O extends object> {
  [OWNER]: O | undefined;
}

/**
 * An owner can be `undefined` in Glimmer.
 *
 * This value tells "no scope is active" apart from "the scope has no owner".
 */
const NO_SCOPE = Symbol('NO_OWNER_SCOPE');

export type OwnerScope = object | undefined | typeof NO_SCOPE;

let currentScope: OwnerScope = NO_SCOPE;

/**
  Framework objects in a Glimmer application may receive an owner object.
  Glimmer is unopinionated about this owner, but will forward it through its
  internal resolution system, and through its managers if it is provided.

  Without an argument, `getOwner` returns the owner of the code that runs now.
  Only code that runs synchronously in an owner scope can do this,
  for example the body of a plain function helper.
*/
export function getOwner(): object | undefined;
export function getOwner(object: object): object | undefined;
export function getOwner(object?: object): object | undefined {
  if (arguments.length === 0) {
    if (currentScope === NO_SCOPE) {
      throw new Error(
        '`getOwner()` was called without an argument, but there is no active owner. ' +
          'Call `getOwner()` synchronously in a plain function helper, or pass an object: `getOwner(object)`.'
      );
    }

    return currentScope;
  }

  return (object as OwnedObject<object>)[OWNER];
}

/**
  `setOwner` set's an object's owner
*/
export function setOwner(object: object, owner: object): void {
  (object as OwnedObject<object>)[OWNER] = owner;
}

/**
 * Makes `owner` the result of `getOwner()` until `exitOwnerScope` runs.
 *
 * Pass the return value to `exitOwnerScope`, so that nested scopes restore
 * the outer owner.
 */
export function enterOwnerScope(owner: object | undefined): OwnerScope {
  let previous = currentScope;

  currentScope = owner;

  return previous;
}

export function exitOwnerScope(previous: OwnerScope): void {
  currentScope = previous;
}
