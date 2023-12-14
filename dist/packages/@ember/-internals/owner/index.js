import { getOwner as glimmerGetOwner, setOwner as glimmerSetOwner } from '@glimmer/owner';
/**
  @private
  @method isFactory
  @param {Object} obj
  @return {Boolean}
  @static
 */
export function isFactory(obj) {
  return obj != null && typeof obj.create === 'function';
}
// NOTE: For docs, see the definition at the public API site in `@ember/owner`;
// we document it there for the sake of public API docs and for TS consumption,
// while having the richer `InternalOwner` representation for Ember itself.
export function getOwner(object) {
  return glimmerGetOwner(object);
}
/**
  `setOwner` forces a new owner on a given object instance. This is primarily
  useful in some testing cases.

  @method setOwner
  @static
  @for @ember/owner
  @param {Object} object An object instance.
  @param {Owner} object The new owner object of the object instance.
  @since 2.3.0
  @public
*/
export function setOwner(object, owner) {
  glimmerSetOwner(object, owner);
}