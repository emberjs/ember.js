import { warn } from '@ember/debug';
import { jQuery, jQueryDisabled } from '@ember/-internals/views';

import { hasDOM } from '@ember/-internals/browser-environment';

/**
  @module ember
*/

const $ = jQuery;

/**
  This method creates a checkbox and triggers the click event to fire the
  passed in handler. It is used to correct for a bug in older versions
  of jQuery (e.g 1.8.3).

  @private
  @method testCheckboxClick
*/
function testCheckboxClick(handler) {
  let input = document.createElement('input');
  $(input)
    .attr('type', 'checkbox')
    .css({ position: 'absolute', left: '-1000px', top: '-1000px' })
    .appendTo('body')
    .on('click', handler)
    .trigger('click')
    .remove();
}

if (hasDOM && !jQueryDisabled) {
  $(function() {
    /*
      Determine whether a checkbox checked using jQuery's "click" method will have
      the correct value for its checked property.

      If we determine that the current jQuery version exhibits this behavior,
      patch it to work correctly as in the commit for the actual fix:
      https://github.com/jquery/jquery/commit/1fb2f92.
    */
    testCheckboxClick(function() {
      if (!this.checked && !$.event.special.click) {
        $.event.special.click = {
          // For checkbox, fire native event so checked state will be right
          trigger() {
            if (this.nodeName === 'INPUT' && this.type === 'checkbox' && this.click) {
              this.click();
              return false;
            }
          },
        };
      }
    });

    // Try again to verify that the patch took effect or blow up.
    testCheckboxClick(function() {
      warn("clicked checkboxes should be checked! the jQuery patch didn't work", this.checked, {
        id: 'ember-testing.test-checkbox-click',
      });
    });
  });
}
