import jQuery from 'ember-views/system/jquery';
import run from 'ember-metal/run_loop';

export function focus(el) {
  if (el && el.is(':input, [contenteditable=true]')) {
    let type = el.prop('type');
    if (type !== 'checkbox' && type !== 'radio' && type !== 'hidden') {
      run(el, function() {
        // Firefox does not trigger the `focusin` event if the window
        // does not have focus. If the document doesn't have focus just
        // use trigger('focusin') instead.
        if (!document.hasFocus || document.hasFocus()) {
          this.focus();
        } else {
          this.trigger('focusin');
        }
      });
    }
  }
}

export function fireEvent(element, type, options = {}) {
  let event = jQuery.Event(type, options);
  jQuery(element).trigger(event);
}
