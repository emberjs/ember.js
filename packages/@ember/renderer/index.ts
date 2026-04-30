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
  etc. that are then used in a template) has been updated in the DOM.

  For example, in a test you might want to update some tracked state and
  then run some assertions after rendering has completed. You _could_ use
  `await settled()` in that location, but in some contexts you don't want to
  wait for full settledness (which includes test waiters, pending AJAX/fetch,
  run loops, etc) but instead only want to know when that updated value has
  been rendered in the DOM. **THAT** is what `await renderSettled()` is
  _perfect_ for.

  ```js
  import { renderSettled } from '@ember/renderer';
  import { render } from '@ember/test-helpers';
  import { tracked } from '@glimmer/tracking';
  import { hbs } from 'ember-cli-htmlbars';
  import { setupRenderingTest } from 'my-app/tests/helpers';
  import { module, test } from 'qunit';

  module('Integration | Component | profile-card', function (hooks) {
    setupRenderingTest(hooks);

    test("it renders the person's name", async function (assert) {
      class Person {
        @tracked name = '';
      }

      this.person = new Person();
      this.person.name = 'John';

      await render(hbs`
        <ProfileCard @name={{this.person.name}} />
      `);

      assert.dom().hasText('John');

      this.person.name = 'Jane';

      await renderSettled(); // Wait until rendering has completed.

      assert.dom().hasText('Jane');
    });
  });
  ```

  @method renderSettled
  @returns {Promise<void>} a promise which fulfills when rendering has completed
  @public
*/

export { renderSettled } from '@ember/-internals/glimmer';

/**
 * Render a component into a DOM element.
 *
 * See also: [RFC#1099](https://github.com/emberjs/rfcs/blob/main/text/1099-renderComponent.md)
 *
 * @method renderComponent
 * @static
 * @for @ember/renderer
 * @param {Object} component The component to render.
 * @param {Object} options
 * @param {Element} options.into Where to render the component in to.
 * @param {Object} [options.owner] Optionally specify the owner to use. This will be used for injections, and overall cleanup.
 * @param {Object} [options.env] Optional renderer configuration
 * @param {Object} [options.args] Optionally pass args in to the component. These may be reactive as long as it is an object or object-like
 * @public
 */
export { renderComponent } from '@ember/-internals/glimmer';
