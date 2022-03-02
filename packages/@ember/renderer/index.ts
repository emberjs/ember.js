/**
  @module @ember/renderer
  @public
*/

/**
 * @class Renderer
 * @public
 */

/**
  Returns a promise which will resolve when rendering has settled. Settled in
  this context is defined as when all of the tags in use are "current" (e.g.
  `renderers.every(r => r._isValid())`). When this is checked at the _end_ of
  the run loop, this essentially guarantees that all rendering is completed.

  @method renderSettled
  @return {Promise<void>} a promise which fulfills when rendering has settled
  @public
*/
export { renderSettled } from '@ember/-internals/glimmer';
