/**
 * The brand for the curly component manager lives in its own module so that
 * code which only needs to *detect* the curly manager (e.g. the resolver)
 * does not have to import the manager itself (and with it the classic
 * component machinery).
 */
export const CURLY_MANAGER_BRAND: unique symbol = Symbol('CURLY_MANAGER_BRAND');

export function isCurlyManager(manager: object): boolean {
  return (manager as any)[CURLY_MANAGER_BRAND] === true;
}
