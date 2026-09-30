/**
 * The brand for the curly component manager lives in its own module.
 * Code that only needs to *detect* the curly manager, such as the resolver,
 * can then skip importing the manager and the classic component machinery with it.
 */
export const CURLY_MANAGER_BRAND: unique symbol = Symbol('CURLY_MANAGER_BRAND');

export function isCurlyManager(manager: object): boolean {
  return (manager as any)[CURLY_MANAGER_BRAND] === true;
}
