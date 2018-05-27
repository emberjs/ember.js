import { context } from 'ember-environment';
import { hasDOM } from 'ember-browser-environment';
import { ENV } from 'ember-environment';

let jQuery;
export let jQueryDisabled = ENV._JQUERY_INTEGRATION === false;

if (hasDOM) {
  jQuery = context.imports.jQuery;

  if (!jQueryDisabled && jQuery) {
    if (jQuery.event.addProp) {
      jQuery.event.addProp('dataTransfer');
    } else {
      // http://www.whatwg.org/specs/web-apps/current-work/multipage/dnd.html#dndevents
      ['dragstart', 'drag', 'dragenter', 'dragleave', 'dragover', 'drop', 'dragend'].forEach(
        eventName => {
          jQuery.event.fixHooks[eventName] = {
            props: ['dataTransfer'],
          };
        }
      );
    }
  } else {
    jQueryDisabled = true;
  }
}

export default (jQueryDisabled ? undefined : jQuery);
