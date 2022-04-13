/**
  @module @ember/renderer
  @public
*/

/**
 * @class Renderer
 * @public
 */

/**
  Returns a promise which will resolve when rendering has completed. In
  this context, rendering is completed when all auto-tracked state that is
  consumed in the template (including any tracked state in models, services,
    etc.  that are then used in a template) has been updated in the DOM.

    For example, in a test you might want to update some tracked state and
    then run some assertions after rendering has completed. You _could_ use
    `await settled()` in that location, but in some contexts you don't want to
    wait for full settledness (which includes test waiters, pending AJAX/fetch,
    run loops, etc) but instead only want to know when that updated value has
    been rendered in the DOM. **THAT** is what `await rerender()` is _perfect_
    for.
  @method renderSettled
  @returns {Promise<void>} a promise which fulfills when rendering has completed
  @public
*/

export { renderSettled } from '@ember/-internals/glimmer';
