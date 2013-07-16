/**
 * @module ember
 * @sub-module ember-testing
 */

var $ = Ember.$;

function testCheckboxClick(handler) {
  $('<input type="checkbox">')
    .css({ position: 'absolute', left: '-1000px', top: '-1000px' })
    .appendTo('body')
    .on('click', handler)
    .click()
    .remove();
}

$(function() {
  /**
   * Determine whether a checkbox checked using jQuery's "click" method will have
   * the correct value for its checked property. In some old versions of jQuery
   * (e.g. 1.8.3) this does not behave correctly.
   *
   * If we determine that the current jQuery version exhibits this behavior,
   * patch it to work correctly as in the commit for the actual fix:
   * https://github.com/jquery/jquery/commit/1fb2f92.
   */
  testCheckboxClick(function() {
    if (!this.checked && !$.event.special.click) {
      $.event.special.click = {
        // For checkbox, fire native event so checked state will be right
        trigger: function() {
          if ($.nodeName( this, "input" ) && this.type === "checkbox" && this.click) {
            this.click();
            return false;
          }
        }
      };
    }
  });

  /**
   * Try again to verify that the patch took effect or blow up.
   */
  testCheckboxClick(function() {
    Ember.warn("clicked checkboxes should be checked! the jQuery patch didn't work", this.checked);
  });
});
