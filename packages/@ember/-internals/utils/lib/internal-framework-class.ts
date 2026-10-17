/**
  Marks the classes that Ember itself builds on `EmberObject`, such as
  `Route`, `Controller` and `Service`.

  The `EmberObject` deprecation applies to classes that extend `EmberObject`
  directly. A class that has this mark, and each subclass of it, stays
  usable.

  This is a Symbol so that application code cannot set the mark by name.

  @private
*/
const FRAMEWORK_CLASS = Symbol('__internal__framework__class__');

export function setFrameworkClass(Class: object): void {
  (Class as Record<symbol, unknown>)[FRAMEWORK_CLASS] = true;
}

/**
  True for a marked class and for each subclass of it.
*/
export function isFrameworkClass(Class: object): boolean {
  return (Class as Record<symbol, unknown>)[FRAMEWORK_CLASS] === true;
}

/**
  True only for the class that Ember marked, not for its subclasses.
*/
export function isOwnFrameworkClass(Class: object): boolean {
  return Object.prototype.hasOwnProperty.call(Class, FRAMEWORK_CLASS);
}
